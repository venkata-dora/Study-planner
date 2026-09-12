import uuid
from django.conf import settings
from django.db import models

class LearningPath(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    subject = models.CharField(max_length=160)
    level = models.CharField(max_length=20)
    description = models.TextField()
    legacy_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["-created_at"]
    def __str__(self):
        return self.title

class Chapter(models.Model):
    path = models.ForeignKey(LearningPath, related_name="chapters", on_delete=models.CASCADE)
    position = models.PositiveIntegerField()
    title = models.CharField(max_length=160)
    outcome = models.TextField()
    class Meta:
        ordering = ["position"]
        constraints = [models.UniqueConstraint(fields=["path", "position"], name="chapter_position_unique")]

class Lesson(models.Model):
    chapter = models.ForeignKey(Chapter, related_name="lessons", on_delete=models.CASCADE)
    position = models.PositiveIntegerField()
    title = models.CharField(max_length=160)
    legacy_id = models.CharField(max_length=100, blank=True)
    blog = models.TextField(blank=True)
    class Meta:
        ordering = ["position"]
        constraints = [models.UniqueConstraint(fields=["chapter", "position"], name="lesson_position_unique")]

class Subtopic(models.Model):
    lesson = models.ForeignKey(Lesson, related_name="subtopics", on_delete=models.CASCADE)
    position = models.PositiveIntegerField()
    title = models.CharField(max_length=500)
    class Meta:
        ordering = ["position"]
        constraints = [models.UniqueConstraint(fields=["lesson", "position"], name="subtopic_position_unique")]

class LessonProgress(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, related_name="progress", on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "lesson"], name="owner_lesson_unique")]

class GenerationJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    path = models.ForeignKey(LearningPath, null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.CharField(max_length=160)
    level = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default="queued", choices=[(v, v) for v in ["queued", "running", "completed", "failed"]])
    stage = models.CharField(max_length=160, default="Preparing your syllabus")
    artifacts = models.JSONField(default=dict)
    error = models.CharField(max_length=500, blank=True)
    prompt_version = models.CharField(max_length=40, default="staged-v1")
    model = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        indexes = [models.Index(fields=["status", "updated_at"])]
