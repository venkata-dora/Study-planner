from django.contrib import admin
from .models import LearningPath, Chapter, Lesson, Subtopic, LessonProgress, GenerationJob
for model in [LearningPath, Chapter, Lesson, Subtopic, LessonProgress, GenerationJob]:
    admin.site.register(model)
