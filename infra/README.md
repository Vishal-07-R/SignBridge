# AI SignBridge - Infrastructure & Containers

AI SignBridge leverages local containerized dependencies for full isolation and zero cloud cost during development.

## Services Overview

| Service | Port(s) | Description | Healthcheck |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | 5432 | Primary relational metadata database | `pg_isready` |
| **Redis 7** | 6379 | In-memory cache & task queue broker | `redis-cli ping` |
| **Mailpit** | 1025 (SMTP), 8025 (Web UI) | Local SMTP mailbox for email testing | HTTP check |
| **MinIO** | 9000 (API), 9001 (Console) | Private S3 object storage | `minio/health/live` |

## Management Commands

### Start Services (Detached)
```bash
docker compose up -d
```

### Check Container Health
```bash
docker compose ps
```

### Stop Services
```bash
docker compose down
```

### Stop and Wipe Volumes (Reset Development State)
```bash
docker compose down -v
```
