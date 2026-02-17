FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY index.js ./
COPY csvProcessor.js ./

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Run the service
CMD ["node", "index.js"]
