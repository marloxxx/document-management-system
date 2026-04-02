# VPS deployment (Docker + Traefik)

Deploy this Laravel app with **Docker Compose** on a host that already runs a shared stack (e.g. [vps-multi-project](https://github.com/marloxxx/vps-multi-project)): Traefik on **`proxy`**, **MySQL** (and optional **Redis**) on **`backend`**.

**Public URL for Laravel** is **`APP_URL`** (full URL, e.g. `https://dms.example.com`). Traefik’s `Host()` rule uses **`APP_HOST`**: set it in **`.env`** to the **bare hostname** only (same host as `APP_URL`, no scheme or path), e.g. `dms.example.com`. Docker Compose interpolates **`APP_HOST`** into the Traefik labels in `docker-compose.yml`.

---

## Source repository

| | URL |
|---|-----|
| **Clone (HTTPS)** | `https://github.com/marloxxx/document-management-system.git` |
| **GitHub** | [github.com/marloxxx/document-management-system](https://github.com/marloxxx/document-management-system) |

After cloning, confirm the remote:

```bash
git remote -v
```

Use **SSH** if you prefer: `git@github.com:marloxxx/document-management-system.git`.

---

## Layout (this repo)

At the repository root:

| Item | Role |
|------|------|
| `Dockerfile` | Multi-stage build: Composer vendor, Vite assets, `webdevops/php-nginx` runtime (PHP 8.4, Nginx on port 80). |
| `docker-compose.yml` | Services **`dms-app`** (web), **`dms-worker`** (queue), **`dms-scheduler`** (cron loop); volume **`dms_storage`** for `storage/`; external networks **`proxy`** / **`backend`**. |
| `.env` | Laravel and Compose: **`APP_URL`**, **`APP_HOST`**, MySQL **`DB_*`**, optional Redis/cache/queue settings, optional **`PROXY_NETWORK`** / **`BACKEND_NETWORK`**. |

There is no deploy wrapper script; use **`docker compose`** from the project root.

---

## Before you start (once per server)

1. **Stack is up** — Docker networks exist:

   ```bash
   docker network ls | grep -E 'proxy|backend'
   ```

2. **DNS** — **A** (or **AAAA**) for your app hostname → this server’s public IP.

3. **Database** — create a MySQL database and user (credentials go into `.env`). Use whatever your stack provides, for example:

   ```bash
   cd /opt/stack
   ./scripts/stack-manage.sh provision-db mysql your_project_name
   ```

---

## Step-by-step

### 1. Clone the project

```bash
sudo mkdir -p /opt/apps
sudo chown "$USER":"$USER" /opt/apps
cd /opt/apps

git clone https://github.com/marloxxx/document-management-system.git
cd document-management-system
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Edit `.env` for production:

- **`APP_URL`** — full URL, e.g. `https://dms.example.com`
- **`APP_HOST`** — **hostname only** for Traefik, must match the host in **`APP_URL`** (e.g. `dms.example.com`). Required for the `Host()` rule in `docker-compose.yml`.
- `APP_ENV=production`, `APP_DEBUG=false`
- `APP_KEY` — generate as usual (`php artisan key:generate` locally, or `docker compose run --rm dms-app php artisan key:generate` after first build)
- **`DB_*`** — MySQL (this project targets **`DB_CONNECTION=mysql`**): e.g. `DB_HOST=mysql`, `DB_PORT=3306`, `DB_DATABASE=…`, `DB_USERNAME=…`, `DB_PASSWORD=…`. The Docker image builds **`pdo_mysql`** in the vendor stage; the runtime base includes MySQL PDO support.
- **Cache / session / queue** — match your deployment: e.g. `CACHE_STORE=database`, `SESSION_DRIVER=database`, `QUEUE_CONNECTION=database` (default in `.env.example`), or **`REDIS_*`** with `redis` drivers if your stack provides Redis and you prefer it for **`dms-worker`** throughput.
- Optional: **`PROXY_NETWORK`** / **`BACKEND_NETWORK`** if your networks are not named `proxy` / `backend`

### 3. Build and start

From the project directory (Compose reads **`.env`** for interpolation and container env):

```bash
docker compose build
docker compose up -d
```

This starts **`dms-app`**, **`dms-worker`**, and **`dms-scheduler`**.

Check:

```bash
docker compose ps
docker compose logs -f dms-app --tail=100
```

### 4. Laravel (first deploy)

```bash
docker compose exec dms-app php artisan migrate --force
docker compose exec dms-app php artisan storage:link
```

Optional production tuning:

```bash
docker compose exec dms-app php artisan config:cache
docker compose exec dms-app php artisan route:cache
docker compose exec dms-app php artisan view:cache
```

### 5. Smoke test

- Browser: your **`APP_URL`** (TLS via Traefik).
- Health: Laravel **`/up`** (`health: '/up'` in `bootstrap/app.php`). The **`dms-app`** healthcheck in `docker-compose.yml` uses the same endpoint internally.

---

## Traefik / TLS

`docker-compose.yml` sets `tls=true` on the router. If your Traefik setup needs a cert resolver (e.g. Let’s Encrypt), add the label your stack documents.

---

## Updating the app later

```bash
cd /opt/apps/document-management-system
git pull
docker compose build
docker compose up -d
docker compose exec dms-app php artisan migrate --force
```

If you changed only PHP/config (no image rebuild needed), you can restart workers after deploy:

```bash
docker compose restart dms-worker dms-scheduler
```

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Traefik `Host()` wrong / 404 | **`APP_HOST`** in **`.env`** must be the bare hostname (no `https://`), matching **`APP_URL`**. |
| Compose labels show empty host | Ensure **`.env`** is in the project root and **`APP_HOST`** is set before `docker compose up`. |
| Database | **`backend`** network, MySQL **`DB_*`** in **`.env`**. |
| Queues not processing | **`dms-worker`** running (`docker compose ps`); if using **`QUEUE_CONNECTION=database`**, migrations include the jobs table; if using **Redis**, check **`REDIS_*`** and connectivity. |
| Scheduled tasks | **`dms-scheduler`** runs `schedule:run` every 60s; ensure cron-only jobs are registered in `routes/console.php` / Laravel scheduler. |

---

## Compose and `.env` (reference)

- **`.env`** holds **`APP_URL`**, **`APP_HOST`**, and Laravel vars. Compose uses it for **`env_file`** and for label interpolation (`APP_HOST`, **`TRAEFIK_ROUTER_NAME`**).
- **`TRAEFIK_ROUTER_NAME`** defaults to **`dms`** in `docker-compose.yml`; export it before `docker compose` if you need a unique router name on a shared Traefik.
- Named volume **`dms_storage`** mounts at **`/app/storage`** for uploads and logs (shared by app, worker, and scheduler).
