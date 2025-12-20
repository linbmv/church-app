#!/bin/bash
set -e

echo "🚀 Deploying church-app..."

# Pull latest images
echo "📦 Pulling latest images from GHCR..."
docker compose -f docker-compose.prod.yml pull

# Stop and remove old containers
echo "🛑 Stopping old containers..."
docker compose -f docker-compose.prod.yml down

# Start new containers
echo "▶️  Starting new containers..."
docker compose -f docker-compose.prod.yml up -d

# Show status
echo "✅ Deployment complete!"
docker compose -f docker-compose.prod.yml ps
