FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend . 

# Generate datasets and train models at build time
RUN python -c "from app.data.dataset_loader import generate_all_datasets; generate_all_datasets()" && \
    python -c "from app.ml.trainer import train_all_models; train_all_models()"

# Set PORT env variable
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Run the application
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "run:app"]
