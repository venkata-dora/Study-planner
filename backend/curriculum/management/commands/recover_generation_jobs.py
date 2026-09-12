from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from curriculum.models import GenerationJob

class Command(BaseCommand):
    help = "Mark jobs silent for over 40 minutes as failed so owners can resume them."
    def handle(self, **options):
        count = GenerationJob.objects.filter(status__in=["queued", "running"], updated_at__lt=timezone.now() - timedelta(minutes=40)).update(status="failed", error="Generation was interrupted. Retry to resume your saved sections.")
        self.stdout.write(f"Recovered {count} interrupted jobs.")
