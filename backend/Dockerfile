# syntax=docker/dockerfile:1
# Build stage: wheels and compilers never reach the runtime image.
FROM python:3.12-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build
COPY requirements.txt .
# pip is removed afterwards: nothing at runtime needs it, and it is a frequent source of scanner findings
RUN python -m venv /opt/venv && /opt/venv/bin/pip install -r requirements.txt \
 && /opt/venv/bin/pip uninstall -y pip

# Runtime stage: non-root, no shell login, code owned by root (read-only for the app user).
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    APP_ENV=production \
    DATABASE_URL=sqlite+aiosqlite:////data/glow.db
RUN groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app \
 && mkdir /app /data && chown app:app /data
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY app ./app
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/ready', timeout=3)"]
# Access logging is done (without IPs or query strings) by the app itself.
# Single worker on purpose: the rate limiter is in-process. The concurrency cap bounds memory under connection floods.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header", "--no-access-log", "--limit-concurrency", "200", "--timeout-keep-alive", "5"]
