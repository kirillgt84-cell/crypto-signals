FROM python:3.11-slim

WORKDIR /app

# Invalidate Docker cache on each build
RUN echo "Cache bust: $(date +%s)"

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Force copy of latest backend files
COPY backend/ .

ENV PYTHONUNBUFFERED=1

# Create startup script
RUN echo '#!/bin/sh\nuvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}' > /app/start.sh && chmod +x /app/start.sh

CMD ["/bin/sh", "/app/start.sh"]
