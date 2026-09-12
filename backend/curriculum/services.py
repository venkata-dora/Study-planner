from django.db import transaction
from .models import LearningPath, Chapter, Lesson, Subtopic

@transaction.atomic
def save_course(owner, subject, level, course, legacy_id=None):
    path = LearningPath.objects.create(owner=owner, subject=subject, level=level, title=course["title"], description=course["description"], legacy_id=legacy_id)
    for i, stage in enumerate(course["stages"]):
        chapter = Chapter.objects.create(path=path, position=i, title=stage["title"], outcome=stage["outcome"])
        for j, topic in enumerate(stage["topics"]):
            lesson = Lesson.objects.create(chapter=chapter, position=j, title=topic["title"], legacy_id=topic.get("id", ""))
            Subtopic.objects.bulk_create([Subtopic(lesson=lesson, position=k, title=value) for k, value in enumerate(topic["subtopics"])])
    return path

def course_payload(path):
    stages, lessons = [], {}
    for chapter in path.chapters.all():
        topics = []
        for lesson in chapter.lessons.all():
            key = str(lesson.pk)
            topics.append({"id": key, "title": lesson.title, "subtopics": [s.title for s in lesson.subtopics.all()]})
            lessons[key] = {"completed": any(p.completed for p in lesson.progress.all() if p.owner_id == path.owner_id), "blog": lesson.blog or None}
        stages.append({"id": str(chapter.pk), "title": chapter.title, "outcome": chapter.outcome, "topics": topics})
    return {"id": str(path.pk), "title": path.title, "subject": path.subject, "level": path.level, "description": path.description, "stages": stages, "lessons": lessons}
