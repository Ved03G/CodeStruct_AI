# Backend Dockerfile
# Use Debian-based image to avoid Prisma OpenSSL/musl issues on Alpine
FROM node:20-bullseye-slim AS base

# Install build tools and git for tree-sitter/native deps and git clones
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		 ca-certificates \
		 openssl \
		 git \
		 python3 \
		 make \
		 g++ \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Generate Prisma client before building
RUN npx prisma generate

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
