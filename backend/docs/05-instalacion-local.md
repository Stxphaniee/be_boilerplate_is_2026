# 05. Instalación y ejecución local

## Requisitos

- Git y Node.js compatible con los `package.json` (el Dockerfile incluido usa Node 24).
- npm y una terminal (Git Bash, PowerShell o equivalente).
- Docker Desktop / Docker Compose para PostgreSQL 18, o servidor PostgreSQL compatible.
- Dos repositorios: frontend y backend.

## 1. Clonar repositorios

```bash
git clone https://github.com/Stxphaniee/be_boilerplate_is_2026.git
git clone https://github.com/Stxphaniee/fe_boilerplate_is_2026.git
```

Son repositorios privados: requiere acceso de GitHub concedido por el equipo.

## 2. Preparar backend

```bash
cd be_boilerplate_is_2026
cp .env.example .env
npm ci
docker compose up -d postgres
```

Completar `.env` con datos de **desarrollo**, no los secretos de producción. Valores de ejemplo para ambiente local:

```dotenv
NODE_ENV=development
PORT=3000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CAMBIAR_CONTRASENA_LOCAL
POSTGRES_DB=si_be_boilerplate
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:CAMBIAR_CONTRASENA_LOCAL@localhost:5432/si_be_boilerplate?schema=public
JWT_SECRET=GENERAR_SECRETO_DE_32_CARACTERES_O_MAS
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=7
BCRYPT_SALT_ROUNDS=12
```

**No utilizar literalmente los textos `CAMBIAR...`/`GENERAR...` como contraseñas definitivas.** La validación del backend exige `DATABASE_URL`, `JWT_SECRET` y que este secreto tenga como mínimo 32 caracteres.

## 3. Migraciones, cliente y datos semilla

```bash
npm run prisma:deploy
npm run prisma:generate
npm run db:seed
```

`npm run prisma:migrate` utiliza `migrate dev`, adecuado para crear migraciones durante desarrollo; `prisma:deploy` aplica las ya versionadas. El seed observado genera cuentas de demostración y temporada y debe revisarse antes de usarlo en una base pública. Evitar utilizar `db:reset` fuera de una base desechable.

## 4. Ejecutar backend

```bash
npm run start:dev
```

Rutas en el ambiente local: `http://localhost:3000/api/v1` y `http://localhost:3000/api/docs`, de acuerdo con el prefijo configurado en `src/main.ts`. El puerto puede cambiar mediante `PORT`.

## 5. Preparar frontend

Usar un puerto distinto al del backend. Ejemplo: NestJS en `3001` y Next.js en `3000` (o dejar NestJS en `3000` y lanzar Next.js en `3001` ajustando enlaces). Se recomienda:

```bash
# En .env del backend: PORT=3001
# Desde el directorio frontend:
cd ../fe_boilerplate_is_2026
cp .env.example .env.local
npm ci
```

En `.env.local`:

```dotenv
API_URL=http://localhost:3001/api/v1/
```

Después:

```bash
npm run dev
```

Abrir `http://localhost:3000` y verificar que el frontend redirija a `/login` cuando corresponda. `API_URL` es variable utilizada desde el servidor Next.js: no sustituirla arbitrariamente por `NEXT_PUBLIC_API_URL`.

## 6. Opción Docker Compose completa

El `docker-compose.yml` del backend define servicios `postgres` y `api`, espera el healthcheck de PostgreSQL y ejecuta migraciones al arrancar el contenedor API. Cuando solo se quiera la base de datos, iniciar `postgres`; para probar ambos contenedores:

```bash
docker compose up --build -d
```

Si se usa Compose completo, la API se publica al puerto configurado en `PORT` y la cadena interna usa hostname `postgres`; no sustituirlo por `localhost` dentro de Docker.

## 7. Compilación y pruebas disponibles

```bash
# Backend
npm run build
npm test
npm run test:e2e

# Frontend
npm run build
npm run lint
```

Los scripts son los observados en los proyectos compartidos. La ejecución de tests E2E requiere la preparación de sus dependencias y base local. Este documento **no incluye el entregable del plan de pruebas ejecutado**.

## 8. Problemas comunes

- **P1000/P1001:** revisar usuario, contraseña, puerto, Docker y `DATABASE_URL`.
- **Prisma P3009:** hay una migración previamente fallida; inspeccionar el motivo y resolver sin resetear datos.
- **Error `\u{feff}` en SQL:** guardar la migración UTF-8 sin BOM, coordinar el checksum con el equipo.
- **401:** verificar sesión, refresh y cookie.
- **500 del backend en Vercel:** no equivale a compilación fallida; revisar logs de ejecución y compatibilidad con serverless.
