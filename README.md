# Clubes

Front React que consume el API de ProjectJA (`/api/v1`). Esta primera versión incluye solo el login.

## Requisitos

Node `^20.19` o `>=22.12` (Vite 8). En esta carpeta hay un `.nvmrc` con `22`.

```bash
nvm install 22
nvm use 22
```

## Desarrollo

1. El back de ProjectJA debe estar en `http://127.0.0.1:8000`.
2. Copia `.env.example` a `.env` si hace falta.
3. Instala y arranca:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`, inicia sesión y, si el usuario tiene varios roles, elige el contexto.

## Docker

```bash
docker compose up --build
```

Queda en `http://localhost:4173`. En Docker/Dokploy, `VITE_API_URL` se lee al **arrancar** el contenedor (Environment). No hace falta rebuild si solo cambias esa URL.

## API

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/context-options`
- `POST /api/v1/auth/context`
- `POST /api/v1/auth/logout`
