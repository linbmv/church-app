#!/bin/sh

# Start backend in background
cd /app/backend
node src/index.js &

# Start nginx in foreground
nginx -g 'daemon off;'
