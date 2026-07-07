FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Generate datasets and train models at build time
RUN python -c "from app.data.dataset_loader import generate_all_datasets; generate_all_datasets()" && \
    python -c "from app.ml.trainer import train_all_models; train_all_models()"

# Create instance directory for SQLite
RUN mkdir -p app/instance

EXPOSE 5000

# Use gunicorn in production
CMD ["python", "run.py"]
