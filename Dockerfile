# Use official Node.js LTS image
FROM node:22

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Expose default port for Probot
EXPOSE 3000

# Run the app
CMD ["npm", "start"]