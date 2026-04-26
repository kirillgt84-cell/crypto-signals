FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cache bust only for app code, not dependencies
RUN echo "Cache bust: $(date +%s)"

COPY backend/ .

ENV PYTHONUNBUFFERED=1

# Use shell form to allow environment variable expansion
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
