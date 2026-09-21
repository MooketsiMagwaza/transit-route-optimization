FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,id=transitos-rider-npm,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund \
    --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY . .

ARG NEXT_PUBLIC_API_BASE=http://localhost:8000
ARG NEXT_PUBLIC_AUTH_URL=
ARG NEXT_PUBLIC_GOOGLE_AUTH=false
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_GOOGLE_AUTH=$NEXT_PUBLIC_GOOGLE_AUTH

RUN npm run build && chown -R node:node /app/.next

USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3002/ || exit 1

CMD ["npm", "start"]
