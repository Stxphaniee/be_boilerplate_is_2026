# 06. Despliegue y publicación

## Objetivo

Publicar frontend y backend con HTTPS desde la versión `main`, conectados a una base PostgreSQL accesible para el servicio, sin secretos en el código. Una publicación se declara funcional únicamente cuando la API y los flujos principales responden correctamente.

## Estado observado durante la preparación documental (21/11/2026)

| Componente | Plataforma / contexto | Estado comprobable |
|---|---|---|
| Frontend | Vercel Hobby | El equipo comunicó publicación; falta registrar URL definitiva y comprobar flujos. |
| Backend | Vercel Hobby; dominio de producción asignado: `https://liga-futbol-backend.vercel.app` | Dominio asignado; una prueba HTTP del endpoint de resultados devolvió `500 INTERNAL_FUNCTION_INVOCATION_FAILED`. Verificar después del último redeploy. |
| Base de datos | Neon PostgreSQL; proyecto `liga-amateur`, rama `production`, Ohio | Proyecto creado; migraciones y datos semilla en nube no confirmados. |
| Render | Se exploró instancia Free | No continuó porque la plataforma solicitó validación de tarjeta no completada. |

La arquitectura de destino es frontend → API REST → PostgreSQL; la plataforma final de backend puede cambiar tras corregir el error de ejecución. No confundir build `Ready` con funcionamiento real de la API.

## Variables de producción (solo nombres)

**Backend:** `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `PORT`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN_DAYS`, `BCRYPT_SALT_ROUNDS`, y las adicionales exigidas por la revisión actual de `src/config/env.validation.ts`.

**Frontend:** `API_URL`, apuntando a la dirección base real de NestJS con el prefijo `/api/v1/`.

Nunca publicar en GitHub las credenciales, tokens, la conexión de Neon ni los secretos del proveedor. Los archivos `.env.example` muestran solo nombres y valores ficticios.

## Procedimiento de publicación de una versión

1. Finalizar y revisar las historias en `develop`.
2. Crear `release/1.0.0` y hacer solo ajustes finales.
3. Abrir PR revisado por otro integrante desde `release/1.0.0` hacia `main`.
4. Fusionar la release de regreso a `develop`.
5. Publicar la etiqueta/release `v1.0.0` en **cada repositorio**.
6. Configurar variables de producción en los servicios de hosting.
7. Aplicar migraciones sobre PostgreSQL **antes** de exponer endpoints que dependan del esquema actualizado, mediante `npm run prisma:deploy` con la conexión de Neon. No ejecutar `prisma migrate reset`.
8. Ejecutar el despliegue desde `main` y comprobar `/api/v1`, `/api/v1/partidos/resultados` y `/api/docs`.
9. Verificar frontend: login, rol, inscripción, calendario, árbitro y resultados. Luego compartir URLs y usuarios de prueba por Moodle.

## Swagger y CORS

`src/main.ts` del ZIP compartido configura Swagger en `/api/docs`. El frontend compartido utiliza un proxy server-side `/api/[...path]`; en ese flujo el navegador se comunica con Next.js y Next.js reenvía la petición al backend. Si alguna pantalla realiza llamadas directas desde el navegador al dominio de la API, configurar CORS restringido al dominio HTTPS real del frontend y probarlo. CORS no sustituye la autenticación JWT.

## Vercel y NestJS

El arranque tradicional presente en `src/main.ts` (`await app.listen(port)`) no garantiza compatibilidad con la ejecución bajo demanda del proveedor. El error observado fue `TypeError [ERR_INVALID_MODULE_SPECIFIER]` en logs con carga de módulos, además del 500. Cualquier adaptación a serverless debe preservar decoradores, rutas, validación, autenticación, configuración ESM, Swagger y conexión Prisma. Un despliegue alternativo como un servicio Node persistente o contenedor evita esa clase particular de diferencias de arranque, pero depende de disponibilidad y límites del proveedor.

## Correcciones posteriores a 1.0.0

Utilizar ramas `hotfix/<descripcion>` nacidas desde `main`, con PR hacia `main`, devolución hacia `develop` y nueva etiqueta, por ejemplo `v1.0.1`. Mantener `main` sincronizada con el código realmente desplegado.

## Comprobación de disponibilidad

El proyecto debe permanecer accesible al menos hasta el martes 24/11/2026 según la guía. Un túnel local temporal no cumple por sí solo una disponibilidad permanente, pues requiere la PC encendida. Si el hosting utiliza suspensión por inactividad, hacer una visita previa de calentamiento antes de la revisión.


## URLs de referencia para la entrega

- API base: `https://liga-futbol-backend.vercel.app/api/v1`
- Swagger: `https://liga-futbol-backend.vercel.app/api/docs`
- Frontend: `https://<DOMINIO-FRONTEND>.vercel.app` (reemplazar por el dominio definitivo de producción).

El formato de la cátedra exige que frontend y backend tengan URL pública HTTPS y que el sistema permanezca disponible durante la revisión. No se debe entregar un dominio de ejemplo como si fuera el dominio real.
