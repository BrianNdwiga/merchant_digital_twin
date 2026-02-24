FROM mcr.microsoft.com/playwright:v1.58.2-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy agent code
COPY agent.js ./

# Run the agent
CMD ["node", "agent.js"]
