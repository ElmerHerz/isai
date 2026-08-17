# Despliegue en DigitalOcean — Entorno de pruebas

Guía paso a paso para levantar ISAI (API + Web + Postgres + Redis) en un único
Droplet de DigitalOcean, con HTTPS gratis vía `sslip.io`, y restaurando el
backup real de la base local. Pensado para **pruebas**, no para producción
comercial (eso implicaría managed database, backups automáticos, monitoreo,
etc. — fuera de alcance aquí).

## Arquitectura

```
Internet
   │  :80 / :443
   ▼
┌─────────────────────────────────────────────┐
│ Droplet (Ubuntu, docker compose)             │
│                                               │
│  ┌────────┐   /api/*   ┌─────────────┐       │
│  │ Caddy  │──────────▶ │ api (Nest)  │       │
│  │ (web + │            │ :3000       │       │
│  │  TLS)  │            └──────┬──────┘       │
│  │  /*    │                   │              │
│  └────────┘         ┌─────────┼─────────┐    │
│                      ▼         ▼         │    │
│                ┌──────────┐ ┌───────┐    │    │
│                │ postgres │ │ redis │    │    │
│                │  :5432   │ │ :6379 │    │    │
│                └──────────┘ └───────┘    │    │
│         (sin puertos publicados al       │    │
│          exterior, solo red interna)     │    │
└─────────────────────────────────────────────┘
```

Caddy hace dos cosas: sirve el build estático de `apps/web` en `/`, y
reenvía todo lo que empiece con `/api` al contenedor de la API. Esto
funciona porque `apiClient` en el frontend ya usa `baseURL: '/api/v1'`
relativo — mismo origen, sin necesidad de configurar CORS entre dominios.

Se eligió **Caddy** en vez de Nginx + Certbot porque obtiene y renueva el
certificado Let's Encrypt automáticamente con 6 líneas de configuración —
para un entorno de pruebas, evita todo el manejo manual de certbot.

---

## ¿Qué es sslip.io y por qué lo usamos?

Para que Let's Encrypt emita un certificado HTTPS válido necesita un
**nombre de dominio** que resuelva a la IP de tu servidor — no puede emitir
certificados para una IP pelona (`http://164.90.123.45`).

Comprar un dominio no es necesario para esto. `sslip.io` es un servicio de
DNS gratuito que resuelve *cualquier* subdominio con una IP incrustada en el
nombre, hacia esa misma IP. Es decir:

```
164-90-123-45.sslip.io  →  resuelve a  →  164.90.123.45
```

No hay que registrar nada ni configurar nada del lado de sslip.io: el
truco es que su servidor DNS lee la IP directamente del nombre que pediste
y la devuelve. Funciona para cualquier IP, al instante, sin propagación de
DNS que esperar (a diferencia de un dominio comprado, donde a veces tarda
minutos u horas en propagar).

**Cómo lo vas a usar:**
1. Creas el Droplet → DigitalOcean te da una IP pública, ej. `164.90.123.45`.
2. Tu "dominio" para este entorno es `164-90-123-45.sslip.io` (los puntos de
   la IP se cambian por guiones).
3. Se lo das a Caddy en el `Caddyfile` (abajo) y Caddy solo, al recibir el
   primer request, pide el certificado a Let's Encrypt usando ese nombre.
4. Entras a `https://164-90-123-45.sslip.io` y ya tienes candado verde.

Limitaciones a tener claras (por eso es solo para pruebas):
- Si el Droplet cambia de IP, la URL cambia también (no es una URL estable
  para compartir a largo plazo).
- El nombre no es memorable/marca — es solo funcional.
- El día que quieras algo serio/comercial, compras el dominio real y el
  cambio es trivial (solo cambias el hostname en el `Caddyfile`).

---

## Prerrequisitos

- Cuenta de DigitalOcean con método de pago.
- Llave SSH (si no tienes: `ssh-keygen -t ed25519 -C "tu-email"` en tu
  máquina, y subir la pública al dashboard de DO al crear el Droplet).
- Tu backup local lo sacas en el paso 6 — no lo prepares antes, la versión
  de Postgres del contenedor debe existir primero para que el `pg_dump`
  sea compatible (ver nota de versión abajo).

---

## Paso 1 — Archivos de despliegue en el repo

Crea estos archivos en la raíz del repo (o pídeme que los genere yo cuando
quieras pasar de la guía a ejecutarla).

### `Dockerfile.api`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /repo
COPY . .
RUN npm ci
RUN npx turbo run build --filter=@isai/api...
RUN npx prisma generate --schema=apps/api/prisma/schema

FROM node:20-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo .
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema && node apps/api/dist/main.js"]
```

> Nota: esta imagen no está optimizada de tamaño (copia todo el monorepo
> con `node_modules` hoisted de npm workspaces). Para un entorno de
> pruebas es la opción más simple y confiable; optimizar viene después si
> esto pasa a ser algo más permanente.

### `Dockerfile.web`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /repo
COPY . .
RUN npm ci
RUN npx turbo run build --filter=@isai/web...

FROM caddy:2-alpine
COPY --from=build /repo/apps/web/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
```

### `Caddyfile`

```
{$SITE_ADDRESS:164-90-123-45.sslip.io} {
	root * /usr/share/caddy
	encode gzip

	handle /api/* {
		reverse_proxy api:3000
	}

	handle {
		try_files {path} /index.html
		file_server
	}
}
```

El hostname no se edita a mano en este archivo: `{$SITE_ADDRESS:...}` lo lee
de la variable de entorno `SITE_ADDRESS` en `.env.production` (el valor
después de los dos puntos es solo el default si no la defines). Así que una
vez tengas la IP del Droplet, solo actualizas `SITE_ADDRESS` en
`.env.production` — nada de tocar el `Caddyfile` ni reconstruir la imagen `web`
por eso.

### `docker-compose.prod.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:17-alpine
    container_name: isai_postgres_prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: isai
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: isai_pruebas
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U isai']
      interval: 10s
      timeout: 5s
      retries: 5
    # Sin "ports:" a propósito — no se expone al exterior, solo red interna.

  redis:
    image: redis:7-alpine
    container_name: isai_redis_prod
    restart: unless-stopped
    volumes:
      - redisdata:/data

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: isai_api_prod
    restart: unless-stopped
    env_file: .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    container_name: isai_web_prod
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    depends_on:
      - api
    volumes:
      - caddy_data:/data
      - caddy_config:/config

volumes:
  pgdata:
  redisdata:
  caddy_data:
  caddy_config:
```

### `.env.production` (no se sube al repo — créalo directo en el Droplet)

```bash
# --- Servidor ---
PORT=3000
NODE_ENV=production

# --- Base de datos (nombre de servicio "postgres" dentro de la red de Docker) ---
POSTGRES_PASSWORD=genera_un_password_fuerte_aqui
DATABASE_URL="postgresql://isai:genera_un_password_fuerte_aqui@postgres:5432/isai_pruebas"

# --- Redis (nombre de servicio "redis") ---
REDIS_HOST=redis
REDIS_PORT=6379

# --- JWT (genera secretos NUEVOS, nunca reutilices los de tu .env local) ---
JWT_SECRET=genera_con_openssl_rand_-hex_64
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=genera_otro_distinto_con_openssl
JWT_REFRESH_EXPIRES_IN=7d

# --- CORS (mismo origen vía Caddy, pero se deja explícito) ---
CORS_ORIGIN=https://164-90-123-45.sslip.io

# --- Caddy: hostname sslip.io para el certificado HTTPS automático ---
SITE_ADDRESS=164-90-123-45.sslip.io
```

Para generar secretos fuertes: `openssl rand -hex 64`.

---

## Paso 2 — Crear el Droplet

1. En el dashboard de DigitalOcean → **Create → Droplet**.
2. Imagen: **Ubuntu 24.04 LTS**.
3. Plan: **Basic → Regular → 2 GB RAM / 1 vCPU** (~$12/mes). Con
   Postgres + Redis + Node + Caddy corriendo juntos, 1 GB se queda corto.
4. Autenticación: **SSH key** (sube tu llave pública, no uses password).
5. Anota la IP pública que te asigna, ej. `164.90.123.45`.
6. Con esa IP, tu hostname sslip.io queda `164-90-123-45.sslip.io` —
   ese es el valor que vas a poner en `.env.production` (`SITE_ADDRESS` y
   `CORS_ORIGIN`) en el Paso 4, ya no hay que tocar el `Caddyfile`.

---

## Paso 3 — Preparar el servidor

```bash
ssh root@164.90.123.45

apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

---

## Paso 4 — Subir el código y configurar variables

```bash
# En el Droplet
mkdir -p /opt/isai && cd /opt/isai
git clone <url-de-tu-repo> .

nano .env.production   # pega el contenido del Paso 1, con secretos reales
```

---

## Paso 5 — Construir y levantar

```bash
cd /opt/isai
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps    # verifica que los 4 servicios estén "healthy"/"running"
```

La primera vez, `prisma migrate deploy` (dentro del contenedor `api`, ver
`CMD` del Dockerfile) va a crear el esquema vacío. Eso está bien — en el
siguiente paso lo reemplazas con tu backup real.

---

## Paso 6 — Restaurar tu backup local tal cual

**En tu máquina Windows** (tu Postgres local corre en el servicio
`postgresql-x64-17`, puerto `5433` — por eso el contenedor usa
`postgres:17-alpine`, misma versión mayor, para que el dump sea compatible):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -p 5433 -U postgres -Fc -f isai_backup.dump isai_desa
```

Copiar el archivo al Droplet:

```powershell
scp isai_backup.dump root@164.90.123.45:/opt/isai/
```

**En el Droplet**, restaurar dentro del contenedor de Postgres:

```bash
cd /opt/isai
docker compose -f docker-compose.prod.yml cp isai_backup.dump postgres:/tmp/isai_backup.dump
docker compose -f docker-compose.prod.yml exec postgres \
  pg_restore -U isai -d isai_pruebas --clean --if-exists /tmp/isai_backup.dump
```

- `--clean --if-exists` borra los objetos vacíos que creó `migrate deploy`
  antes de restaurar los tuyos, así no hay conflicto.
- El dump incluye la tabla `_prisma_migrations`, así que Prisma sigue
  sabiendo qué migraciones ya se aplicaron — no hace falta re-correr nada
  a menos que crees migraciones nuevas después de este punto.
- Reinicia la API para que tome la data fresca: `docker compose -f docker-compose.prod.yml restart api`

---

## Paso 7 — Verificar

- `https://164-90-123-45.sslip.io` → debe cargar el frontend.
- `https://164-90-123-45.sslip.io/api/v1/...` → responde la API.
- Prueba login con un usuario real de tu backup restaurado.
- Logs si algo falla: `docker compose -f docker-compose.prod.yml logs -f api`

---

## Operación día a día

**Redesplegar tras un cambio de código:**
```bash
cd /opt/isai
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**Migraciones nuevas** (creadas después de restaurar el backup) se aplican
solas al reiniciar el contenedor `api` (el `CMD` corre `migrate deploy` en
cada arranque).

**Ver logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f          # todo
docker compose -f docker-compose.prod.yml logs -f api      # solo la API
```

**Respaldar la base ya corriendo en el Droplet** (por si quieres bajar el
estado de las pruebas de vuelta a tu máquina):
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U isai -Fc isai_pruebas -f /tmp/salida.dump
docker compose -f docker-compose.prod.yml cp postgres:/tmp/salida.dump ./salida.dump
```

---

## Notas de seguridad (aunque sea "solo pruebas")

- Nunca reutilices `JWT_SECRET`/`JWT_REFRESH_SECRET` de tu `.env` local —
  genera unos nuevos para este entorno.
- Postgres y Redis **no** publican puertos al exterior (`ports:` omitido
  en el compose) — solo alcanzables entre contenedores.
- Tu backup puede traer datos reales de personas (nombres, emails,
  contraseñas hasheadas con bcrypt). Aun siendo "solo pruebas", queda en
  un servidor con IP pública — no compartas la URL/credenciales fuera del
  grupo que realmente necesita probar.
- `.env.production` nunca se commitea al repo (ya está cubierto por el
  `.gitignore` existente para `.env*`).
