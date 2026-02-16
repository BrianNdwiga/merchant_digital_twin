FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (none for now, but good practice)
RUN npm install --production

# Copy agent code
COPY agent.js ./

# Run the agent
CMD ["node", "agent.js"]
