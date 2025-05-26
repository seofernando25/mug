FROM oven/bun:1 AS base

# Set the working directory
WORKDIR /app

# Copy package.json, lockfile, and .npmrc
COPY package.json bun.lock .npmrc ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the SvelteKit port
EXPOSE 5173

# Start the SvelteKit development server
# Using --host to make it accessible from outside the container
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"] 