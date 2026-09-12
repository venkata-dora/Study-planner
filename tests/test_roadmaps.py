import json
import sqlite3
import tempfile
import unittest
from flask import Flask
from roadmap_api import register_roadmaps


class RoadmapTests(unittest.TestCase):
    def setUp(self):
        self.file = tempfile.NamedTemporaryFile(suffix='.db')
        self.calls = []
        self.response = json.dumps({'title': 'Learn Java', 'description': 'Build a small application.', 'stages': [{'title': 'Foundations', 'outcome': 'Write your first program', 'topics': [{'title': 'Variables', 'subtopics': ['Types', 'Scope']}]}]})
        def connect():
            conn = sqlite3.connect(self.file.name)
            conn.row_factory = sqlite3.Row
            return conn
        def generate(prompt, **kwargs):
            self.calls.append(prompt)
            return self.response, 'test'
        app = Flask(__name__)
        register_roadmaps(app, connect, generate)
        self.client = app.test_client()

    def tearDown(self):
        self.file.close()

    def create(self):
        response = self.client.post('/api/roadmaps', json={'subject': 'Java', 'level': 'Beginner'})
        self.assertEqual(response.status_code, 201)
        return response.json

    def test_saved_path_lesson_and_progress(self):
        path = self.create()
        url = '/api/roadmaps/' + path['id']
        self.assertEqual(self.client.get(url).json['title'], 'Learn Java')
        self.assertEqual(len(self.client.get('/api/roadmaps').json), 1)
        lesson_url = url + '/lessons/s0t0'
        self.assertTrue(self.client.patch(lesson_url, json={'completed': True}).json['completed'])
        self.response = '# Variables\n\nA Java lesson.'
        self.assertEqual(self.client.post(lesson_url).json['blog'], self.response)
        self.assertIn('Java', self.calls[-1])
        count = len(self.calls)
        self.client.post(lesson_url)
        self.assertEqual(len(self.calls), count, 'Saved lessons should not generate again')
        self.assertTrue(self.client.get(url).json['lessons']['s0t0']['completed'])
        self.assertFalse(self.client.patch(lesson_url, json={'completed': False}).json['completed'])
        self.assertEqual(self.client.get(url).json['lessons']['s0t0']['blog'], self.response)

    def test_invalid_input_and_provider_response(self):
        for body in [[], {'subject': ''}, {'subject': 'Java', 'level': 'Bad'}]:
            self.assertEqual(self.client.post('/api/roadmaps', json=body).status_code, 400)
        self.assertEqual(len(self.calls), 0)
        for response, status in [(None, 503), ('{}', 502), ('not JSON', 502)]:
            self.response = response
            self.assertEqual(self.client.post('/api/roadmaps', json={'subject': 'Java'}).status_code, status)
        self.assertEqual(self.client.get('/api/roadmaps').json, [])

    def test_missing_topics_and_invalid_progress(self):
        path = self.create()
        url = '/api/roadmaps/' + path['id'] + '/lessons/'
        self.assertEqual(self.client.post(url + 'missing').status_code, 404)
        self.assertEqual(self.client.patch(url + 's0t0', json={'completed': 'yes'}).status_code, 400)
        self.assertEqual(self.client.get('/api/roadmaps/missing').status_code, 404)

    def test_delete_path_and_its_lessons(self):
        path = self.create()
        url = '/api/roadmaps/' + path['id']
        self.assertEqual(self.client.patch(url + '/lessons/s0t0', json={'completed': True}).status_code, 200)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get('/api/roadmaps').json, [])
        self.assertEqual(self.client.delete(url).status_code, 404)

    def test_beginner_ml_path_gets_python_and_numpy_foundations(self):
        self.response = json.dumps({
            'title': 'Machine Learning',
            'description': 'Train a useful first model.',
            'stages': [{
                'title': 'Models',
                'outcome': 'Fit and evaluate a regression model.',
                'topics': [{
                    'title': 'Linear regression',
                    'subtopics': ['predictions', 'loss functions', 'gradient descent', 'evaluation metrics', 'residual analysis'],
                }],
            }],
        })
        response = self.client.post('/api/roadmaps', json={'subject': 'Machine learning', 'level': 'Beginner'})
        self.assertEqual(response.status_code, 201)
        data = response.json
        text = json.dumps(data).lower()
        self.assertEqual(data['stages'][0]['title'], 'Python Foundations for Machine Learning')
        self.assertIn('variables', text)
        self.assertIn('functions', text)
        self.assertIn('loops', text)
        self.assertGreaterEqual(sum(1 for stage in data['stages'] for topic in stage['topics'] if 'numpy' in topic['title'].lower()), 2)
        self.assertIn('Python syntax/control flow', self.calls[0])

    def test_existing_beginner_ml_paths_are_enriched_without_changing_old_topic_ids(self):
        self.client.get('/api/roadmaps')
        old = {
            'id': 'saved',
            'subject': 'ML',
            'level': 'Beginner',
            'title': 'ML',
            'description': 'A compact ML path.',
            'stages': [{
                'id': 's0',
                'title': 'Models',
                'outcome': 'Train a model.',
                'topics': [{'id': 's0t0', 'title': 'Regression', 'subtopics': ['loss', 'fit', 'predict']}],
            }],
        }
        conn = sqlite3.connect(self.file.name)
        try:
            conn.execute('INSERT INTO learning_roadmaps (id, content) VALUES (?, ?)', ('saved', json.dumps(old)))
            conn.commit()
        finally:
            conn.close()
        data = self.client.get('/api/roadmaps/saved').json
        topic_ids = [topic['id'] for stage in data['stages'] for topic in stage['topics']]
        self.assertIn('s0t0', topic_ids)
        self.assertIn('ml-python-foundations-syntax', topic_ids)


if __name__ == '__main__':
    unittest.main()
