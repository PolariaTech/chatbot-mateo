# Mateo — Chatbot de IA (Polaria Tech)

Asistente virtual **Mateo**, desplegado en [chatbot-mateo.vercel.app](https://chatbot-mateo.vercel.app). App independiente del WMS que consume **polaria-wms-api** para autenticación real.

## Flujos de acceso

### A) Login directo en Mateo

1. El usuario abre Mateo en el navegador.
2. Clic en **Iniciar sesión**.
3. Ingresa **nombre de usuario** y **contraseña** (las mismas del ecosistema Polaria / Supabase Auth).
4. Si el usuario pertenece a un tenant, la API responde `422` y se muestra el campo **Código de empresa**.
5. Tras login exitoso, la sesión se persiste en `localStorage` y el chat envía el contexto del usuario al webhook de n8n.

### B) SSO desde el WMS

1. El usuario ya está logueado en **polaria-wms-web**.
2. Clic en **Mateo IA** → redirección a `/auth/sso?code=XXX`.
3. Mateo canjea el código con `POST /auth/mateo-exchange` en polaria-wms-api.
4. Se guarda la sesión y se redirige a `/` sin pedir contraseña.

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | URL base del API WMS. Producción: `https://polaria-wms-api.onrender.com` |

En Vercel, configura la misma variable en **Settings → Environment Variables**.

## Contrato API (polaria-wms-api)

Todas las peticiones de login Mateo incluyen el header `X-Auth-Client: mateo`.

| Método | Ruta | Uso |
|--------|------|-----|
| `POST` | `/auth/prelogin` | Validar usuario; detectar si requiere código de empresa |
| `POST` | `/auth/login` | Login con username + contraseña (+ código empresa) |
| `GET` | `/auth/me` | Hidratar sesión con `Authorization: Bearer {token}` |
| `POST` | `/auth/logout` | Cerrar sesión en servidor |
| `POST` | `/auth/mateo-exchange` | Canjear código SSO desde el WMS |

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Cómo probar con el WMS

1. Asegúrate de que **polaria-wms-api** esté desplegado con los endpoints de Mateo.
2. En **polaria-wms-web**, el botón **Mateo IA** debe redirigir a:
   ```
   https://chatbot-mateo.vercel.app/auth/sso?code={code}
   ```
   (o `http://localhost:3000/auth/sso?code={code}` en local).
3. El `code` lo genera el WMS/API al iniciar el flujo SSO; Mateo lo canjea una sola vez.
4. Para login directo, usa un usuario existente en el WMS con su **username** (no correo).

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

## Estructura relevante

```
src/
  lib/
    auth-api.js      # Cliente HTTP hacia polaria-wms-api
    auth-storage.js  # Persistencia de tokens + usuario
  hooks/
    useAuth.js       # Login, logout, hidratación /auth/me
    useChat.js       # Chat con contexto de usuario
  app/
    auth/sso/        # Ruta SSO desde WMS
  components/
    LoginForm.js     # Username + contraseña (+ empresa)
```
