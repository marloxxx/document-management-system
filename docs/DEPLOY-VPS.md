# VPS deployment (Docker + Traefik)

Deploy this Laravel app with **Docker Compose** on a host that already runs a shared stack (e.g. [vps-multi-project](https://github.com/marloxxx/vps-multi-project)): Traefik on **`proxy`**, Postgres/Redis/MySQL on **`backend`**.

**Public URL for Laravel** is **`APP_URL`** only (full URL, e.g. `https://dms.example.com`). There is no `APP_HOST` in `.env`. Traefik’s `Host()` rule needs a bare hostname; **`scripts/compose.sh`** derives that from **`APP_URL`** and exports **`TRAEFIK_HOST`** for Compose (not stored in `.env`).

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

## Before you start (once per server)

1. **Stack is up** — Docker networks exist:

   ```bash
   docker network ls | grep -E 'proxy|backend'
   ```

2. **DNS** — **A** (or **AAAA**) for your app hostname → this server’s public IP.

3. **Database** — create a database and user (credentials go into `.env`):

   ```bash
   cd /opt/stack
   ./scripts/stack-manage.sh provision-db postgres your_project_name
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
chmod +x scripts/compose.sh
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Edit `.env` for production:

- **`APP_URL`** — full URL, e.g. `https://dms.example.com`
- `APP_ENV=production`, `APP_DEBUG=false`
- `APP_KEY` — generate as usual
- **`DB_*`** — from `provision-db` (e.g. `DB_HOST=postgres`, `DB_CONNECTION=pgsql`, …)
- **`REDIS_*`** — `REDIS_HOST=redis`, password from the host stack `/opt/stack/.env`
- `CACHE_STORE=redis`, `SESSION_DRIVER=redis`, `QUEUE_CONNECTION=redis` (recommended)
- Optional: **`PROXY_NETWORK`** / **`BACKEND_NETWORK`** if your networks are not named `proxy` / `backend` (see `.env.example` footer)

### 3. Build and start

Use **`./scripts/compose.sh`** so **`TRAEFIK_HOST`** is set from **`APP_URL`** (do **not** run plain `docker compose up` for the app service, or Traefik labels will not get a valid hostname).

```bash
./scripts/compose.sh build
./scripts/compose.sh up -d
```

Check:

```bash
./scripts/compose.sh ps
./scripts/compose.sh logs -f dms-app --tail=100
```

### 4. Laravel (first deploy)

```bash
./scripts/compose.sh exec dms-app php artisan migrate --force
./scripts/compose.sh exec dms-app php artisan storage:link
```

### 5. Smoke test

- Browser: your **`APP_URL`** (TLS via Traefik).
- Health: Laravel **`/up`** (`health: '/up'` in `bootstrap/app.php`).

---

## Traefik / TLS

`docker-compose.yml` sets `tls=true` on the router. If your Traefik setup needs a cert resolver (e.g. Let’s Encrypt), add the label your stack documents.

---

## Updating the app later

```bash
cd /opt/apps/document-management-system
git pull
./scripts/compose.sh build
./scripts/compose.sh up -d
./scripts/compose.sh exec dms-app php artisan migrate --force
```

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Traefik `Host()` wrong / blank | Use **`./scripts/compose.sh`**, not raw `docker compose`, so `TRAEFIK_HOST` is derived from **`APP_URL`**. |
| `compose.sh: set APP_URL in .env` | **`APP_URL`** must be set and valid (e.g. `https://your-hostname`). |
| Database / Redis | Same as before: `backend` network, credentials in `.env`. |

---

## Compose and `.env` (reference)

- **`.env`** holds **`APP_URL`** (and Laravel vars). **No** `APP_HOST` / `TRAEFIK_HOST` in the file.
- **`TRAEFIK_HOST`** exists only in the shell when you run **`scripts/compose.sh`**; Compose uses it for label interpolation.
- **`TRAEFIK_ROUTER_NAME`** defaults to **`dms`** in `docker-compose.yml`; override by exporting it before `compose.sh` if you need a unique router name.
- **`env_file: .env`** injects variables into containers.
