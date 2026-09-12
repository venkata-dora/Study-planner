import json
import sqlite3
from pathlib import Path
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from curriculum.models import LearningPath, LessonProgress
from curriculum.services import save_course

class Command(BaseCommand):
    help = "Copy legacy SQLite roadmaps into a specified account without modifying the source."
    def add_arguments(self, parser):
        parser.add_argument("database")
        parser.add_argument("--owner", required=True)
        parser.add_argument("--dry-run", action="store_true")
    @transaction.atomic
    def handle(self, database, owner, dry_run, **options):
        user = get_user_model().objects.filter(username=owner).first()
        if not user:
            raise CommandError("Owner account does not exist")
        source = Path(database).resolve()
        if not source.is_file():
            raise CommandError("Source database does not exist")
        count = 0
        conn = sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            for row in conn.execute("SELECT id, content FROM learning_roadmaps"):
                if LearningPath.objects.filter(legacy_id=row["id"]).exists():
                    continue
                value = json.loads(row["content"])
                path = save_course(user, value["subject"], value["level"], value, legacy_id=row["id"])
                saved = {v["topic_id"]: v for v in conn.execute("SELECT * FROM learning_roadmap_lessons WHERE roadmap_id=?", (row["id"],))}
                for chapter in path.chapters.all():
                    for lesson in chapter.lessons.all():
                        old = saved.get(lesson.legacy_id)
                        if old:
                            lesson.blog = old["blog"] or ""
                            lesson.save(update_fields=["blog"])
                            LessonProgress.objects.create(owner=user, lesson=lesson, completed=bool(old["completed"]))
                count += 1
        finally:
            conn.close()
        if dry_run:
            transaction.set_rollback(True)
        self.stdout.write(f"{'Would import' if dry_run else 'Imported'} {count} roadmaps.")
