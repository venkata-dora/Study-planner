import logging
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import connection, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from .models import LearningPath, Lesson, LessonProgress, GenerationJob
from .services import course_payload
from .tasks import generate_course

logger = logging.getLogger(__name__)

def health(request):
    return JsonResponse({"status": "ok"})

def ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        from redis import Redis
        Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2).ping()
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ready"})

@api_view(["GET"])
@permission_classes([AllowAny])
def session(request):
    return Response({"csrfToken": get_token(request), "user": {"username": request.user.username} if request.user.is_authenticated else None})

@method_decorator(csrf_protect, name="dispatch")
class Login(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"error": "Expected an object."}, status=400)
        username, password = request.data.get("username"), request.data.get("password")
        if not isinstance(username, str) or not isinstance(password, str) or len(username) > 150 or len(password) > 4096:
            return Response({"error": "Enter a valid username and password."}, status=400)
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"error": "Incorrect username or password."}, status=400)
        login(request, user)
        return Response({"username": user.username, "csrfToken": get_token(request)})

@api_view(["POST"])
def sign_out(request):
    logout(request)
    return Response({"ok": True})

class GenerateInput(serializers.Serializer):
    subject = serializers.CharField(min_length=2, max_length=160)
    level = serializers.ChoiceField(choices=["Beginner", "Intermediate", "Advanced"], default="Beginner")

class ProgressInput(serializers.Serializer):
    completed = serializers.BooleanField()
    def validate_completed(self, value):
        if type(self.initial_data.get("completed")) is not bool:
            raise serializers.ValidationError("Expected a boolean.")
        return value

def owned_paths(user):
    return LearningPath.objects.filter(owner=user).prefetch_related("chapters__lessons__subtopics", "chapters__lessons__progress")

@api_view(["GET"])
def paths(request):
    return Response([course_payload(p) for p in owned_paths(request.user)])

@api_view(["GET", "DELETE"])
def path_detail(request, pk):
    path = get_object_or_404(owned_paths(request.user), pk=pk)
    if request.method == "DELETE":
        path.delete()
        return Response(status=204)
    return Response(course_payload(path))

@api_view(["PATCH", "POST"])
def lesson_progress(request, pk, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id, chapter__path_id=pk, chapter__path__owner=request.user)
    if request.method == "POST":
        if lesson.blog:
            return Response({"blog": lesson.blog})
        return Response({"error": "This release generates course structure. New reading generation is not enabled yet."}, status=501)
    data = ProgressInput(data=request.data)
    data.is_valid(raise_exception=True)
    progress, _ = LessonProgress.objects.update_or_create(owner=request.user, lesson=lesson, defaults=data.validated_data)
    return Response({"completed": progress.completed, "blog": lesson.blog or None})

def enqueue(job):
    try:
        generate_course.delay(str(job.pk))
    except Exception as exc:
        logger.error("Unable to enqueue job %s (%s)", job.pk, type(exc).__name__)
        GenerationJob.objects.filter(pk=job.pk).update(status="failed", error="The generation queue is unavailable. Please retry shortly.")

class Generate(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "generation"
    def post(self, request):
        data = GenerateInput(data=request.data)
        data.is_valid(raise_exception=True)
        if not all([settings.LLM_BASE_URL, settings.LLM_API_KEY, settings.LLM_MODEL]):
            return Response({"error": "Course generation is not configured yet."}, status=503)
        with transaction.atomic():
            # Serialize submissions per account so simultaneous requests cannot bypass the limit.
            from django.contrib.auth import get_user_model
            get_user_model().objects.select_for_update().get(pk=request.user.pk)
            if GenerationJob.objects.filter(owner=request.user, status__in=["queued", "running"]).exists():
                return Response({"error": "A course is already being prepared for your account."}, status=409)
            job = GenerationJob.objects.create(owner=request.user, **data.validated_data)
            transaction.on_commit(lambda: enqueue(job))
        return Response({"id": str(job.pk), "status": job.status}, status=202)

@api_view(["GET"])
def job_detail(request, pk):
    job = get_object_or_404(GenerationJob, pk=pk, owner=request.user)
    return Response({"id": str(job.pk), "status": job.status, "subject": job.subject, "level": job.level, "stage": job.stage, "error": job.error, "path_id": str(job.path_id) if job.path_id else None})

class RetryJob(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "generation"
    def post(self, request, pk):
        with transaction.atomic():
            from django.contrib.auth import get_user_model
            get_user_model().objects.select_for_update().get(pk=request.user.pk)
            job = get_object_or_404(GenerationJob.objects.select_for_update(), pk=pk, owner=request.user)
            if job.status != "failed":
                return Response({"error": "Only failed jobs can be retried."}, status=409)
            if GenerationJob.objects.filter(owner=request.user, status__in=["queued", "running"]).exists():
                return Response({"error": "Another course is being prepared."}, status=409)
            job.status, job.error = "queued", ""
            job.save(update_fields=["status", "error", "updated_at"])
            transaction.on_commit(lambda: enqueue(job))
        return Response({"id": str(job.pk), "status": "queued"}, status=202)
