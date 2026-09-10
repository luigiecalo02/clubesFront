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

## PWA

La app se puede instalar en el teléfono o el escritorio. El service worker se genera en el build (`npm run build` + `npm run preview` o Docker). En desarrollo (`npm run dev`) no se registra, para no interferir con Vite.

En Chrome o Edge, usa **Instalar aplicación** cuando el navegador lo ofrezca, o el icono de instalar en la barra de direcciones. En iPhone: Compartir → Añadir a pantalla de inicio.

## Docker

```bash
docker compose up --build
```

Queda en `http://localhost:4173`. `VITE_API_URL` se fija en el build.

## API

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/context-options`
- `POST /api/v1/auth/context`
- `POST /api/v1/auth/logout`
