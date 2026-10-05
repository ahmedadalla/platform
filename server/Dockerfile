FROM node:20-alpine

# Install dependencies for native modules (Baileys uses some native deps)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (including devDeps needed for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Create necessary directories
RUN mkdir -p uploads data/sessions

EXPOSE 5000

# Push schema to database if tables do not exist, then start
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
