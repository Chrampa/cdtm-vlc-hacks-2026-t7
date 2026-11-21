# Production image: builds the web UI, then serves API + UI from one uvicorn process.
FROM node:22-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY matcher/ matcher/
COPY --from=web /web/dist web/dist
# Mount the dataset at runtime: -v $PWD/data:/app/data:ro
ENV PORT=8765
EXPOSE 8765
CMD ["sh", "-c", "uv run --no-dev uvicorn matcher.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers"]
