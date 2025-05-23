# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile
FROM node:lts-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

# Copy the rest of the source code
COPY . .

# Build the TypeScript source code
RUN npm run build

# Expose any ports if needed (not required for stdio-based server)

# Run the MCP server
CMD [ "node", "build/index.js" ]
