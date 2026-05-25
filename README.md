# Calidad & Capacitación — Guía de deploy

## Estructura final del proyecto

```
calidad-capacitacion/
├── server.js                  ← Servidor Express
├── package.json
├── .env                       ← Variables de entorno (NO al repo)
├── .env.example               ← Plantilla del .env
├── .gitignore
├── config/
│   └── db.js                  ← SQLite setup + seed inicial
├── middleware/
│   └── auth.js                ← JWT + roles
├── routes/
│   ├── auth.js                ← POST /api/auth/login|register
│   ├── members.js             ← CRUD /api/members
│   ├── scores.js              ← GET /api/scores, /api/scores/courses
│   ├── news.js                ← CRUD /api/news
│   └── prode.js               ← /api/prode/*
├── data/
│   └── app.db                 ← SQLite (se crea solo, NO al repo)
└── public/                    ← Frontend (copiá tus archivos acá)
    ├── index.html
    ├── style.css
    ├── app.js                 ← El nuevo app.js (reemplaza el viejo)
    └── database.js            ← Ya no es necesario, podés borrarlo
```

---

## Paso a paso

### 1. Preparar el proyecto localmente

```bash
# Clonar o crear la carpeta
mkdir calidad-capacitacion && cd calidad-capacitacion

# Copiar todos los archivos del backend

# Instalar dependencias
npm install

# Crear el .env a partir del ejemplo
cp .env.example .env
```

Editar `.env`:
```
JWT_SECRET=pegar_aqui_una_clave_larga_y_aleatoria
CORS_ORIGIN=https://tu-app.railway.app
ADMIN_DEFAULT_PASS=admin123
```

Para generar el JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Copiar el frontend a /public

Mover tus archivos al directorio `/public`:
- `index.html` (sin cambios)
- `style.css` (sin cambios)
- `app.js` → reemplazar con el nuevo `app.js` que llama a la API
- `database.js` → ya no hace falta, pero no rompe si lo dejás

El nuevo `app.js` reemplaza todo el localStorage/DB_* por llamadas
reales a la API. El frontend ya no tiene datos hardcodeados.

### 3. Probar localmente

```bash
npm run dev
```

Abrir http://localhost:3000 — debería funcionar igual que antes
pero los datos ahora viven en SQLite.

### 4. Deploy en Railway

1. Crear cuenta en https://railway.app (gratis)
2. Nuevo proyecto → "Deploy from GitHub repo"
   - Conectar el repo con el código
   - Railway detecta automáticamente que es Node.js
3. En la sección "Variables":
   ```
   JWT_SECRET     = (tu clave generada)
   CORS_ORIGIN    = https://tu-app.railway.app
   NODE_ENV       = production
   ```
   Railway setea PORT solo, no hace falta agregarlo.
4. Deploy — Railway construye e inicia el servidor automáticamente.
5. HTTPS: Railway asigna un dominio `*.railway.app` con SSL/TLS incluido.
   Si tenés dominio propio, en Settings → Domains lo agregás.

---

## Seguridad implementada

| Medida                     | Detalle                                          |
|----------------------------|--------------------------------------------------|
| Contraseñas hasheadas      | bcrypt con salt rounds = 10                      |
| JWT en sessionStorage      | Se borra al cerrar pestaña, no en localStorage   |
| Rate limiting en login     | 10 intentos / 15 minutos por IP                  |
| Rate limiting en registro  | 5 intentos / hora por IP                         |
| Headers de seguridad       | Helmet.js (X-Frame-Options, CSP, etc.)           |
| CORS configurado           | Solo acepta requests del dominio permitido       |
| Validación de inputs       | En todas las rutas del backend                   |
| Roles verificados en API   | Admin-only routes protegidas con middleware      |
| Foreign keys en SQLite     | Integridad referencial activada                  |

---

## Después del primer deploy

1. Entrar con `admin / admin123`
2. Cambiar la contraseña del admin desde la configuración
3. Actualizar `ADMIN_DEFAULT_PASS` en Railway si cambiaste el valor en .env

---

## Agregar partidos del Mundial al prode

Los partidos no se seedean automáticamente (son muchos y los tenías
en el database.js original). Para cargarlos:

```bash
# Correr el script de import una sola vez
node scripts/import-matches.js
```

O más fácil: conectarse a la DB directamente con un cliente SQLite
y hacer el INSERT masivo desde el database.js original.
# quality-hub
