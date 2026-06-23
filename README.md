# Mateo — Chatbot de IA (Polaria Tech)

Asistente virtual **Mateo**, desplegado en [chatbot-mateo.vercel.app](https://chatbot-mateo.vercel.app). App independiente del WMS que consume **polaria-wms-api** para autenticación real.

## Flujos de acceso

### A) Login directo en Mateo

1. El usuario abre Mateo en el navegador.
2. Clic en **Iniciar sesión**.
3. Ingresa **nombre de usuario** y **contraseña** (las mismas del ecosistema Polaria / Supabase Auth).
4. Si el usuario pertenece a un tenant, la API responde `422` y se muestra el campo **Código de empresa**.
5. Tras login exitoso, la sesión se persiste en `localStorage` y el chat envía el contexto del usuario al webhook de n8n.

### B) SSO desde el WMS (WMS → Mateo)

1. El usuario ya está logueado en **polaria-wms-web**.
2. Clic en **Mateo IA** → el WMS genera un código con `POST /auth/mateo-handoff` y redirige a:
   ```
   https://chatbot-mateo.vercel.app/auth/sso?code={code}
   ```
3. Mateo canjea el código con `POST /auth/mateo-exchange` en polaria-wms-api (`SsoClient.js`).
4. Se guarda la sesión en `localStorage` y se redirige a `/` sin pedir contraseña.

### C) SSO hacia el WMS (Mateo → WMS)

1. El usuario está logueado en Mateo (sesión en `localStorage`).
2. Clic en **Polaria WMS** (`WmsLinkButton`).
3. Mateo solicita un código con `POST /auth/mateo-handoff` (`Authorization: Bearer` de la sesión actual).
4. Mateo cierra la sesión local, invalida la sesión en servidor (`POST /auth/logout`) y redirige a:
   ```
   https://polaria-wms-web.vercel.app/auth/sso?code={code}
   ```
5. El WMS canjea el código con `POST /auth/mateo-exchange` y deja al usuario logueado.

**Requisito:** **polaria-wms-web** debe exponer la ruta `/auth/sso` para consumir el `code` (espejo de `/auth/sso` en Mateo).

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | URL base del API WMS. Producción: `https://polaria-wms-api.onrender.com` |
| `NEXT_PUBLIC_WMS_LOGIN_URL` | URL base del WMS. Producción: `https://polaria-wms-web.vercel.app/` (usada para SSO y login manual) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL base del proyecto Supabase (sin `/rest/v1` al final). Usada en servidor para persistir el historial de chat. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (Settings → API → `service_role`). **Solo servidor**, nunca con prefijo `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_ALLOW_DIRECT_LOGIN` | Opcional. `true` fuerza login directo en producción; `false` fuerza SSO vía WMS. Por defecto: habilitado solo en `localhost`. |

### Despliegue en Vercel

1. En **Settings → Environment Variables**, configura **todas** las variables anteriores para **Production** (y Preview si aplica).
2. `SUPABASE_SERVICE_ROLE_KEY` debe marcarse como **Sensitive** y no exponerse al cliente.
3. Tras añadir o cambiar variables, **vuelve a desplegar** (Redeploy) para que surtan efecto. Sin redeploy, las rutas `/api/mateo/*` responderán `503 Supabase no está configurado` aunque las variables ya estén guardadas.
4. Verifica en producción: `GET /api/mateo/conversaciones` con un token válido debe responder `200`, no `503`.

## Contrato API (polaria-wms-api)

Todas las peticiones de login Mateo incluyen el header `X-Auth-Client: mateo`, excepto `mateo-handoff` (usa solo `Authorization: Bearer`).

| Método | Ruta | Uso |
|--------|------|-----|
| `POST` | `/auth/prelogin` | Validar usuario; detectar si requiere código de empresa |
| `POST` | `/auth/login` | Login con username + contraseña (+ código empresa) |
| `GET` | `/auth/me` | Hidratar sesión con `Authorization: Bearer {token}` |
| `POST` | `/auth/logout` | Cerrar sesión en servidor |
| `POST` | `/auth/mateo-handoff` | Generar código SSO de un solo uso (`{ code, expiresIn: 60 }`) |
| `POST` | `/auth/mateo-exchange` | Canjear código SSO (WMS → Mateo o Mateo → WMS) |

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Cómo probar con el WMS

1. Asegúrate de que **polaria-wms-api** esté desplegado con los endpoints de Mateo (`mateo-handoff`, `mateo-exchange`).
2. En **polaria-wms-web**, debe existir `/auth/sso` para canjear códigos entrantes desde Mateo.
3. **WMS → Mateo:** el botón **Mateo IA** redirige a `https://chatbot-mateo.vercel.app/auth/sso?code={code}`.
4. **Mateo → WMS:** el botón **Polaria WMS** redirige a `https://polaria-wms-web.vercel.app/auth/sso?code={code}`.
5. Para login directo en Mateo (localhost), usa un usuario existente en el WMS con su **username** (no correo).

## Chat y webhook n8n

Con sesión activa, cada mensaje se envía a n8n con:

```json
{
  "message": "texto del usuario",
  "usuario": {
    "username": "...",
    "idUsuario": "...",
    "codigoEmpresa": "...",
    "nombre": "..."
  }
}
```

Sin sesión, el chat no envía mensajes y se solicita iniciar sesión.

### Historial en Supabase

Con sesión activa y Supabase configurado, cada mensaje (usuario y asistente) se guarda vía las rutas API internas:

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/api/mateo/conversaciones` | Listar conversaciones del usuario |
| `POST` | `/api/mateo/conversaciones` | Crear conversación |
| `GET` | `/api/mateo/conversaciones/{id}/mensajes` | Mensajes de una conversación |
| `POST` | `/api/mateo/conversaciones/{id}/mensajes` | Guardar mensaje |

El webhook de n8n responde al chat aunque Supabase falle; si el historial no se guarda en producción, revisa las variables de Supabase y que el último deploy sea posterior a su configuración.

## Estructura relevante

```
src/
  lib/
    auth-api.js      # Cliente HTTP hacia polaria-wms-api
    auth-storage.js  # Persistencia de tokens + usuario
    mateo-api.js     # Cliente hacia /api/mateo (historial)
    supabase-server.js # Cliente Supabase (solo servidor)
  hooks/
    useAuth.js       # Login, logout, hidratación /auth/me
    useChat.js       # Chat con contexto de usuario + persistencia
  app/
    api/mateo/       # API de conversaciones y mensajes
    auth/sso/        # Ruta SSO desde WMS
  components/
    LoginForm.js     # Username + contraseña (+ empresa)
```
