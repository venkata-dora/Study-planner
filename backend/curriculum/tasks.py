import logging
from celery import shared_task
from django.conf import settings
from django.db import transaction
from .models import GenerationJob
from .generator import compile_course
from .services import save_course
logger = logging.getLogger(__name__)

@shared_task
def generate_course(job_id):
    # Atomic claim makes duplicate deliveries harmless. Failed jobs require an explicit retry.
    if not GenerationJob.objects.filter(pk=job_id, status="queued").update(status="running"):
        return
    job = GenerationJob.objects.get(pk=job_id)
    try:
        job.model = settings.LLM_MODEL
        job.save(update_fields=["model", "updated_at"])
        result = compile_course(job)
        with transaction.atomic():
            job.path = save_course(job.owner, job.subject, job.level, result)
            job.status = "completed"
            job.stage = "Your course is ready"
            job.error = ""
            job.save(update_fields=["path", "status", "stage", "error", "updated_at"])
    except Exception as exc:
        # Never return provider responses, credentials or prompts to clients/logs.
        logger.error("Generation job %s failed (%s)", job_id, type(exc).__name__)
        GenerationJob.objects.filter(pk=job_id).update(status="failed", error="Course generation stopped. Retry to resume from the last saved section.")
