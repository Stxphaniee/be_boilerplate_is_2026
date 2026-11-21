# Backend de la liga — corrección para Vercel

## Qué se corrigió
- 184 referencias a alias TypeScript en 76 archivos `src/*.ts`.
- Las importaciones `@Auth`, `@Prisma`, `@PrismaClient`, `@Matches`, `@Teams`, etc. usan ahora rutas relativas `.js` compatibles con `moduleResolution: nodenext`.
- No se alteró la lógica de los controladores, servicios, repositorios, esquemas ni DTO.
- `package.json` ya tiene `"postinstall": "prisma generate"`; no es necesario instalar herramientas nuevas.

## Forma rápida (si ya tienes tu repo con Git)
1. Descomprime **solo el ZIP de parche** en la raíz de tu repositorio, aceptando reemplazar los archivos de `src`.
2. Abre Git Bash en el repositorio y ejecuta:

   ```bash
   npx prisma generate
   npm run build
   git add src
   git commit -m ":bug:[FIX] Resolver imports ESM y aliases para Vercel"
   git push origin main
   ```

3. Vercel debe desplegar automáticamente el nuevo commit. Prueba la ruta pública `/api/v1/partidos/resultados` o `/api/docs`.

## Importantísimo sobre la base de datos
- Para que funcione en internet, en el proyecto Vercel configura `DATABASE_URL` con una **base PostgreSQL accesible desde Internet** (NO `localhost` ni el contenedor de tu computadora).
- Configura `JWT_SECRET` y las demás variables necesarias en Settings > Environment Variables, sin subir `.env` a GitHub.
- Este repositorio proporcionado no incluye migraciones SQL de aplicación dentro de `prisma/migrations` (solo `migration_lock.toml`): verifica que la base remota ya tenga las tablas o prepara y aplica las migraciones de manera controlada antes de probar endpoints con datos.

## Validación realizada
- Se comprobaron 184 reemplazos en 76 archivos y que todas las nuevas rutas resuelven a archivos presentes.
- Compilación de comprobación completada tras aislar *solo localmente* el error de tipado del Prisma Client **obsoleto** incluido en el ZIP original. La prueba NO altera el código entregado.
- En la versión recibida, `src/generated/prisma` está desactualizado y falta `AuditoriaResultado` aunque el modelo existe en `prisma/schema.prisma`. Se excluye el cliente generado del ZIP: `npx prisma generate` lo reconstruirá con los tipos correctos.
- No se ha probado conexión real a PostgreSQL ni desplegado remotamente desde este entorno.

## Seguridad y tamaño
- Se excluyeron `.env`, `.env.local`, `.git`, `node_modules`, `dist`, `.vercel`, archivos generados y cachés.
- **No compartas credenciales** ni hagas commit de archivos `.env`.
