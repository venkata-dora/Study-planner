# Django migration and operations

## Implemented in this release

The existing Flask development app remains available. The new **opt-in Django course backend** has owner-scoped courses, chapters, lessons, subtopics, progress, session login/logout, admin, and asynchronous course generation. Generation creates scope, chapter outline, chapter-specific lessons and lesson-specific subtopics in separate calls. Validated outputs are checkpointed; explicit retries reuse completed steps. There is one active job per user and rate limiting. Duplicate queue deliveries cannot create duplicate courses.

This is a migration release, not a declaration that every existing feature is production-ready. The Docker gateway deliberately does not expose legacy unauthenticated Flask APIs. Static learning pages remain available, but their unmigrated dynamic features return a clear error. Blog generation is out of scope for this release; imported saved blogs remain readable. Curriculum completeness still needs evaluation against reference syllabi; schema validation alone does not prove educational quality. Source retrieval and semantic coverage review are follow-up work.

## Local Docker setup

Requires Docker Engine running and Docker Compose 2.24.4+.

```sh
cp deploy/.env.example deploy/.env
# Edit deploy/.env: replace both secrets and configure your provider.
docker compose --env-file deploy/.env up --build -d
docker compose --env-file deploy/.env exec api python manage.py createsuperuser
```

Open http://localhost:8080 and use **My learning paths** to sign in. Admin is at `/admin/`. Accounts are currently provisioned through admin; public signup, email verification and password reset must be implemented before opening public registration. Use separate non-staff accounts for learners.

The provider must implement `/chat/completions` with JSON-object responses. Set `LLM_BASE_URL` including `/v1`, `LLM_API_KEY`, and `LLM_MODEL`. No provider or paid call is configured automatically. A course is bounded to 12 chapters and 96 lessons, with at most one format-repair call per step. Large courses can still require many calls. Budget controls beyond per-user rate limiting are required before an unrestricted public launch.

PostgreSQL and Redis persist in named volumes and have no published host ports. Migrations run as a one-shot service before API and workers start. Images run the application as a non-root user. Do not run `down -v` on data you need.

## Local development without Docker

```sh
python3 -m venv .venv-backend
.venv-backend/bin/pip install -r backend/requirements.lock
export DJANGO_DEBUG=true
export DJANGO_SECRET_KEY=local-development-only
.venv-backend/bin/python backend/manage.py migrate
.venv-backend/bin/python backend/manage.py createsuperuser
.venv-backend/bin/python backend/manage.py runserver 8000
# In another terminal, with the same environment and a running Redis:
cd backend
../.venv-backend/bin/celery -A config worker --loglevel=info
# In another terminal, from repository root:
VITE_DJANGO_API=true npm run dev
```

Set `CSRF_TRUSTED_ORIGINS=http://localhost:5173` for Vite proxy development. Export provider configuration into the worker environment. The default Vite launch without the flag still uses the existing Flask backend. Django never imports Flask or its database initialization.

## Import saved roadmaps

Back up `planner.db` first. Create the destination account. The importer reads SQLite in read-only mode, imports saved blogs and progress, and skips previously imported IDs. A dry run exercises actual inserts inside a rolled-back transaction.

```sh
DJANGO_DEBUG=true DJANGO_SECRET_KEY=local-development-only .venv-backend/bin/python backend/manage.py import_legacy_roadmaps planner.db --owner YOUR_USERNAME --dry-run
DJANGO_DEBUG=true DJANGO_SECRET_KEY=local-development-only .venv-backend/bin/python backend/manage.py import_legacy_roadmaps planner.db --owner YOUR_USERNAME
```

For Docker, copy the source DB into the container using `docker compose cp` then run the command there. New UUID URLs differ from old URLs. Source IDs are preserved in `legacy_id`; redirects for old bookmarks are not implemented. The importer does not migrate built-in-track progress or the separate legacy blog library yet.

## Production host, before AWS

Set `APP_DOMAIN`, `DJANGO_ALLOWED_HOSTS` to your real hostname, `CSRF_TRUSTED_ORIGINS=https://YOUR_HOST`, a random 50+ character `DJANGO_SECRET_KEY`, and a random URL-safe database password in `deploy/.env`. Keep that file outside version control and restrict its permissions. Point DNS at the host and permit 80/443. The production overlay enables secure cookies, HTTPS redirects, HSTS and Caddy-managed TLS. No debug service should be exposed.

```sh
docker compose --env-file deploy/.env -f compose.yaml -f compose.production.yaml config --quiet
docker compose --env-file deploy/.env -f compose.yaml -f compose.production.yaml up --build -d
docker compose --env-file deploy/.env -f compose.yaml -f compose.production.yaml exec api python manage.py check --deploy --fail-level WARNING
```

The production Nginx config trusts HTTPS only because it is private behind Caddy. Never expose that web container directly. Django trusts the proxy header only in this configuration. Treat Django/DRF throttles as application quotas, not a complete denial-of-service defense. Edge limits provide an additional layer.

## Checks and delivery

- `ci.yml`: PostgreSQL-backed API tests, migrations drift checks, Django deployment checks, frontend tests/build, Python/npm vulnerability audits, Docker builds and live Compose smoke tests.
- `release.yml`: manually triggered image publication to GHCR, tagged with the commit SHA, with SBOM/provenance. Configure the GitHub `release` environment to restrict who may publish. It publishes images; it does not deploy to a server.
- Dependabot checks Python, npm and GitHub Actions dependencies weekly.
- `backend/requirements.lock` pins the resolved Python dependencies. Regenerate in a clean environment after updating `requirements.in`, then run CI.

Deployment to AWS is intentionally deferred. The images can later run on ECS, with PostgreSQL on RDS and Redis on ElastiCache. No AWS resources, costs or credentials are introduced here.

## Operations and recovery

`/health/live` checks process liveness. `/health/ready` checks PostgreSQL and Redis. Worker execution is verified through generation status; API health alone does not prove the worker is consuming jobs. Logs go to stdout and avoid provider payloads. Use the admin to inspect generation status, checkpoint artifacts and failure state. Restrict admin access.

Run `python manage.py recover_generation_jobs` every five minutes from an external scheduler. It marks jobs silent for 40 minutes as failed so learners can retry. Queue publication failure is recorded as a failed job. Worker hard termination is recovered by this command. Do not shorten the stale threshold below the worker time limit.

Run `sh deploy/backup.sh` daily. Copy encrypted backups off-host and define retention. Test restoration into a **separate empty database**:

```sh
# Replace the target name; never restore blindly over the live database.
docker compose --env-file deploy/.env exec -T db createdb -U learning learning_restore_test
docker compose --env-file deploy/.env exec -T db pg_restore -U learning -d learning_restore_test < backups/CHOSEN.dump
```

Check course counts and open sample courses after a restore. Monitor disk space, database connections, queue age, failure rate, provider latency and spending. Add alert delivery and centralized error reporting before public launch. A local backup script is not an off-site backup service.

Before upgrading: take a backup, test migrations against a restored copy, record image tags, then run migrations once and roll out API/worker. Rolling back an image does not undo a database migration; use backward-compatible schema changes or a tested restore procedure.

## Remaining launch gates

1. Migrate the legacy library, built-in progress, practice and reader APIs with ownership checks; never deploy the current arbitrary-code practice execution endpoint without isolation.
2. Add signup, verification, password recovery and account deletion/data export, plus a reviewed privacy/retention policy.
3. Evaluate curriculum completeness; add reference-source retrieval and coverage repair. Add per-account spending budgets, cancellation and generation history.
4. Exercise live provider failures, worker termination, concurrent submissions and a real PostgreSQL restore under representative load.
5. Configure off-host backups, monitoring/alerts, image vulnerability scanning, and deployment environment protections.
6. Complete the reader/library frontend migration and browser QA across devices before switching all users.

References used: [Django deployment checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/), [Celery Django integration](https://docs.celeryq.dev/en/main/django/first-steps-with-django.html), [Docker Compose production guidance](https://docs.docker.com/compose/how-tos/production/).
