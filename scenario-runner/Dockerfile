FROM node:18-alpine

# Install Docker CLI (needed to spawn agent containers)
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY index.js ./

# Create scenarios directory
RUN mkdir -p /app/scenarios

# Run the service
CMD ["node", "index.js"]
