from django.contrib import admin
from django.urls import path
from curriculum import views
urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/live", views.health), path("health/ready", views.ready),
    path("api/v1/session", views.session), path("api/v1/login", views.Login.as_view()), path("api/v1/logout", views.sign_out),
    path("api/v1/roadmaps", views.paths),
    path("api/v1/roadmaps/<uuid:pk>", views.path_detail),
    path("api/v1/roadmaps/<uuid:pk>/lessons/<int:lesson_id>", views.lesson_progress),
    path("api/v1/generation", views.Generate.as_view()),
    path("api/v1/generation/<uuid:pk>", views.job_detail),
    path("api/v1/generation/<uuid:pk>/retry", views.RetryJob.as_view()),
]
