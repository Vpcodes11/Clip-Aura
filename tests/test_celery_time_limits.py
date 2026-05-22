from pathlib import Path

from app.config import CELERY_TASK_SOFT_TIME_LIMIT, CELERY_TASK_TIME_LIMIT
from app.workers.celery_app import celery_app
from app.workers.tasks import format_job_error_message


def test_celery_app_has_soft_and_hard_time_limits():
    assert CELERY_TASK_SOFT_TIME_LIMIT == 540
    assert CELERY_TASK_TIME_LIMIT == 600
    assert celery_app.conf.task_soft_time_limit == 540
    assert celery_app.conf.task_time_limit == 600


def test_worker_command_has_runtime_limits():
    compose = Path("docker-compose.yml").read_text(encoding="utf-8")

    assert "--soft-time-limit=540" in compose
    assert "--time-limit=600" in compose
    assert "--concurrency=4" in compose


def test_soft_time_limit_error_has_clear_job_message():
    from celery.exceptions import SoftTimeLimitExceeded

    assert format_job_error_message(SoftTimeLimitExceeded()) == "Celery task soft time limit exceeded."
