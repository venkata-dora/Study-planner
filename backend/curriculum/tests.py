from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from .models import GenerationJob, LearningPath
from .services import save_course
from .tasks import generate_course
from .generator import validate, InvalidPlan

COURSE = {"title": "Python", "description": "Learn Python", "stages": [{"title": "Basics", "outcome": "Write a program", "topics": [{"title": "Variables", "subtopics": ["Assignment", "Types", "Naming"]}]}]}

@override_settings(SECURE_SSL_REDIRECT=False, CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class CourseTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = get_user_model().objects.create_user(username="owner", password="test-password-438!")
        self.other = get_user_model().objects.create_user(username="other", password="test-password-438!")
        self.client = APIClient()
        self.path = save_course(self.owner, "Python", "Beginner", COURSE)
    def test_anonymous_cannot_read_courses(self):
        self.assertEqual(self.client.get('/api/v1/roadmaps').status_code, 403)
    def test_owner_isolation_and_delete(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/v1/roadmaps').json(), [])
        self.assertEqual(self.client.delete(f'/api/v1/roadmaps/{self.path.pk}').status_code, 404)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(f'/api/v1/roadmaps/{self.path.pk}').status_code, 204)
        self.assertFalse(LearningPath.objects.exists())
    def test_progress_is_scoped_and_strict(self):
        lesson = self.path.chapters.first().lessons.first()
        url = f'/api/v1/roadmaps/{self.path.pk}/lessons/{lesson.pk}'
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.patch(url, {"completed": True}, format='json').status_code, 404)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.patch(url, {"completed": "false"}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(url, {"completed": True}, format='json').status_code, 200)
        result = self.client.get(f'/api/v1/roadmaps/{self.path.pk}').json()
        self.assertTrue(result['lessons'][str(lesson.pk)]['completed'])
    def test_login_requires_csrf_and_rotates_token(self):
        client = APIClient(enforce_csrf_checks=True)
        body = {"username": "owner", "password": "test-password-438!"}
        self.assertEqual(client.post('/api/v1/login', body).status_code, 403)
        token = client.get('/api/v1/session').json()['csrfToken']
        result = client.post('/api/v1/login', body, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(result.status_code, 200)
        self.assertNotEqual(result.json()['csrfToken'], token)
        self.assertEqual(client.get('/api/v1/session').json()['user']['username'], 'owner')
    @override_settings(LLM_BASE_URL="https://example.invalid/v1", LLM_API_KEY="test", LLM_MODEL="test")
    @patch('curriculum.views.generate_course.delay')
    def test_submit_after_commit_and_prevent_duplicate(self, delay):
        self.client.force_authenticate(self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/v1/generation', {'subject': 'Python'}, format='json')
        self.assertEqual(response.status_code, 202)
        delay.assert_called_once()
        self.assertEqual(self.client.post('/api/v1/generation', {'subject': 'Python'}, format='json').status_code, 409)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/v1/generation/' + response.json()['id']).status_code, 404)
    @patch('curriculum.tasks.compile_course', return_value=COURSE)
    def test_duplicate_worker_delivery_does_not_duplicate_course(self, compiler):
        job = GenerationJob.objects.create(owner=self.owner, subject='Python', level='Beginner')
        generate_course(str(job.pk)); generate_course(str(job.pk))
        compiler.assert_called_once()
        job.refresh_from_db()
        self.assertEqual(job.status, 'completed')
        self.assertIsNotNone(job.path_id)
    @patch('curriculum.tasks.compile_course', side_effect=RuntimeError('private provider details'))
    def test_failure_sanitized(self, compiler):
        job = GenerationJob.objects.create(owner=self.owner, subject='Python', level='Beginner', artifacts={'scope': {'coverage': ['types']}})
        generate_course(str(job.pk))
        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        self.assertNotIn('private', job.error)
        self.assertIn('scope', job.artifacts)
    def test_invalid_dependencies_and_duplicate_subtopics(self):
        with self.assertRaises(InvalidPlan):
            validate('outline', {'title': 'x', 'description': 'x', 'chapters': [{'title': 'A', 'outcome': 'x', 'requires': [1]}, {'title': 'B', 'outcome': 'x', 'requires': []}]})
        with self.assertRaises(InvalidPlan):
            validate('subtopics', {'subtopics': ['Types', 'types', 'Names']})
    @patch('curriculum.generator.generate_json')
    def test_resume_uses_checkpoints(self, generate):
        from .generator import compile_course
        job = GenerationJob.objects.create(owner=self.owner, subject='Python', level='Beginner', artifacts={
            'scope': {}, 'outline': {'title': 'Python', 'description': 'Practice', 'chapters': [{'title': 'Basics', 'outcome': 'Write'}]},
            'chapter:0': {'lessons': ['Variables']}, 'lesson:0:0': {'subtopics': ['Names', 'Types', 'Values']}})
        result = compile_course(job)
        generate.assert_not_called()
        self.assertEqual(result['stages'][0]['topics'][0]['title'], 'Variables')

    @patch('curriculum.views.generate_course.delay', side_effect=ConnectionError('private'))
    @override_settings(LLM_BASE_URL='https://example.invalid/v1', LLM_API_KEY='test', LLM_MODEL='test')
    def test_broker_failure_is_recoverable(self, delay):
        self.client.force_authenticate(self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/v1/generation', {'subject': 'Python'}, format='json')
        job = GenerationJob.objects.get(pk=response.json()['id'])
        self.assertEqual(job.status, 'failed')
        self.assertNotIn('private', job.error)

    @patch('curriculum.views.generate_course.delay')
    def test_retry_preserves_checkpoints(self, delay):
        job = GenerationJob.objects.create(owner=self.owner, subject='Python', level='Beginner', status='failed', artifacts={'scope': {'coverage': ['types']}})
        self.client.force_authenticate(self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(f'/api/v1/generation/{job.pk}/retry')
        self.assertEqual(response.status_code, 202)
        job.refresh_from_db()
        self.assertIn('scope', job.artifacts)
        delay.assert_called_once()

    def test_import_is_read_only_idempotent_and_preserves_progress(self):
        import json
        import sqlite3
        import tempfile
        from pathlib import Path
        from django.core.management import call_command
        from .models import LessonProgress
        with tempfile.TemporaryDirectory() as directory:
            filename = Path(directory) / 'legacy.db'
            conn = sqlite3.connect(filename)
            conn.execute('CREATE TABLE learning_roadmaps (id TEXT, content TEXT)')
            conn.execute('CREATE TABLE learning_roadmap_lessons (roadmap_id TEXT, topic_id TEXT, completed INTEGER, blog TEXT)')
            course = json.loads(json.dumps(COURSE))
            course.update(subject='Python', level='Beginner')
            course['stages'][0]['topics'][0]['id'] = 'topic1'
            conn.execute('INSERT INTO learning_roadmaps VALUES (?, ?)', ('legacy1', json.dumps(course)))
            conn.execute('INSERT INTO learning_roadmap_lessons VALUES (?, ?, ?, ?)', ('legacy1', 'topic1', 1, '# Saved lesson'))
            conn.commit(); conn.close()
            before = filename.read_bytes()
            call_command('import_legacy_roadmaps', str(filename), owner='owner', dry_run=True)
            self.assertFalse(LearningPath.objects.filter(legacy_id='legacy1').exists())
            call_command('import_legacy_roadmaps', str(filename), owner='owner')
            call_command('import_legacy_roadmaps', str(filename), owner='owner')
            self.assertEqual(LearningPath.objects.filter(legacy_id='legacy1').count(), 1)
            self.assertEqual(filename.read_bytes(), before)
            progress = LessonProgress.objects.get(owner=self.owner, lesson__chapter__path__legacy_id='legacy1')
            self.assertTrue(progress.completed)
            self.assertEqual(progress.lesson.blog, '# Saved lesson')
