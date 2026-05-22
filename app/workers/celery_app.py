from celery import Celery
from app.config import CELERY_TASK_SOFT_TIME_LIMIT, CELERY_TASK_TIME_LIMIT, REDIS_URL

celery_app = Celery(
    "clip_aura",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_soft_time_limit=CELERY_TASK_SOFT_TIME_LIMIT,
    task_time_limit=CELERY_TASK_TIME_LIMIT,
)
