## Source repository

| | URL |
|---|-----|
| **Clone (HTTPS)** | `https://github.com/marloxxx/document-management-system.git` |
| **GitHub** | [github.com/marloxxx/document-management-system](https://github.com/marloxxx/document-management-system) |

After cloning, confirm the remote:

```bash
git remote -v
# origin  https://github.com/marloxxx/document-management-system.git (fetch)
# origin  https://github.com/marloxxx/document-management-system.git (push)
```

Use **SSH** instead if you prefer: `git@github.com:marloxxx/document-management-system.git`.

---

## Before you start (once per server)

1. **Stack is up** — core services running so Docker networks exist:

   ```bash
   docker network ls | grep -E 'proxy|backend'
   ```

   If missing, start the stack (e.g. `stackctl start core` from your operator’s docs).

2. **DNS** — **A** (or **AAAA**) for your app hostname → this server’s public IP.

3. **Database** — create a database and user for this app (credentials go into `.env`):

   ```bash
   cd /opt/stack
   ./scripts/stack-manage.sh provision-db postgres your_project_name
   ```

   Use the output (often also in `/opt/stack/.project-db-credentials.txt`).

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

Stay on `main` or checkout a release tag if you use tags.

### 2. Create `.env`

```bash
cp .env.example .env
```

Edit `.env` for production:

- `APP_ENV=production`, `APP_DEBUG=false`
- `APP_KEY` — generate, e.g. `openssl rand -base64 32` then prefix with `base64:` or run `php artisan key:generate --show` on any machine with PHP
- `APP_URL=https://your-hostname.example`
- Uncomment and set **`APP_HOST`** (hostname only, no `https://`) — required for Traefik labels in `docker-compose.yml`
- Optionally **`TRAEFIK_ROUTER_NAME`** (default in compose: `dms`; must be unique per router on the host)
- **`DB_*`** — from `provision-db` (e.g. `DB_HOST=postgres`, `DB_CONNECTION=pgsql`, …)
- **`REDIS_*`** — `REDIS_HOST=redis`, password from the host stack `/opt/stack/.env`
- `CACHE_STORE=redis`, `SESSION_DRIVER=redis`, `QUEUE_CONNECTION=redis` (recommended)
- If your Docker networks are not named `proxy` / `backend`, set **`PROXY_NETWORK`** and **`BACKEND_NETWORK`** (see `.env.example` footer)

Compose reads **`.env`** next to `docker-compose.yml` for both **variable substitution** (`${APP_HOST}`, …) and **`env_file`** inside containers.

### 3. Build and start

```bash
docker compose build
docker compose up -d
```

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

Optional: `php artisan config:cache` after you are happy with `.env`.

### 5. Smoke test

- In a browser: `https://your-hostname` (TLS via Traefik).
- Health endpoint used by Compose: Laravel exposes **`/up`** (see `health: '/up'` in `bootstrap/app.php`).

---

## Traefik / TLS

This project’s `docker-compose.yml` sets `tls=true` on the router. If your Traefik setup requires a named certificate resolver (e.g. Let’s Encrypt), add the label your stack documents (often `traefik.http.routers.<name>.tls.certresolver=letsencrypt`).

---

## Updating the app later

```bash
cd /opt/apps/document-management-system
git pull
docker compose build
docker compose up -d
docker compose exec dms-app php artisan migrate --force
```

Run `config:cache` again if you changed config.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| `APP_HOST` / Traefik errors on `compose up` | `.env` exists beside `docker-compose.yml` and defines `APP_HOST` (and router name if you customised it). |
| Database connection errors | Container can reach `postgres` / `mysql` on **`backend`**; credentials match `provision-db`. |
| Redis errors | `REDIS_PASSWORD` matches the stack `.env`; `REDIS_HOST=redis`. |
| Unhealthy container | `docker compose logs dms-app`; hit `/up` inside the container per healthcheck. |

---

## Compose and `.env` (reference)

- **Interpolation**: `${APP_HOST}`, `${TRAEFIK_ROUTER_NAME:-dms}`, `${BACKEND_NETWORK:-backend}` are read from the project **`.env`** when Compose parses the file.
- **Containers**: `env_file: .env` passes the same file into `dms-app`, `dms-worker`, and `dms-scheduler`.
- You do **not** need duplicate `environment:` entries in Compose for `APP_ENV` / `APP_DEBUG` if they are already in `.env`.
