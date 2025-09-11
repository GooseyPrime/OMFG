# Use official Node.js LTS image
FROM node:22

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Create a non-root user for security
RUN groupadd -r omfg && useradd -r -g omfg omfg && chown -R omfg:omfg /app
USER omfg

# Set environment variables for production
ENV NODE_ENV=production

# Expose default port for Probot
EXPOSE 3000

# Add healthcheck - the new startup script ensures /health always works
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || curl -f http://localhost:3000/health || exit 1

# Run the app with new startup script
CMD ["npm", "start"]