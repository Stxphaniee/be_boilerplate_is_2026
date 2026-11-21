# 04. API REST y Swagger

## Convenciones

- **Base de la API:** `/api/v1` (prefijo configurado en `src/main.ts`).
- **Swagger:** `/api/docs`.
- **Formato:** JSON sobre HTTP/HTTPS.
- **Autenticación:** `Authorization: Bearer <access_token>` en rutas privadas.
- **Autorización:** `JwtAuthGuard` y `RolesGuard` globales; las rutas públicas utilizan `@Public()`.
- **Validación:** DTO + `ValidationPipe` con `whitelist`, `forbidNonWhitelisted` y `transform`.
- **Errores habituales:** 400 (entrada inválida), 401 (sin sesión/token válido), 403 (rol o pertenencia), 404 (recurso inexistente), 409 (conflicto de estado/regla) y 500 (error inesperado).

**Swagger de producción previsto:** `https://liga-futbol-backend.vercel.app/api/docs`. El código configura esta ruta; la disponibilidad pública debe verificarse en el despliegue.

## Autenticación y usuarios

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| POST | `/api/v1/users` | Público | Crear cuenta; el servidor asigna rol `JUGADOR`. |
| POST | `/api/v1/auth/login` | Público | Iniciar sesión y emitir tokens. |
| POST | `/api/v1/auth/refresh` | Público, refresh token válido | Rotar refresh token y emitir nuevos tokens. |
| POST | `/api/v1/auth/logout` | Público, refresh token | Revocar la sesión. |
| GET | `/api/v1/auth/me` | JWT | Obtener el usuario autenticado. |
| GET | `/api/v1` | Público | Health check básico. |

El token de acceso se envía como Bearer. El refresh token es opaco, se almacena hasheado y se rota al renovarlo. Las contraseñas se hashean con bcrypt.

## Equipos y plantilla (H1–H3)

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| POST | `/api/v1/teams` | `CAPITAN` | Inscribir equipo y plantilla. |
| GET | `/api/v1/teams/mine` | `CAPITAN` | Consultar el equipo del capitán autenticado. |
| GET | `/api/v1/teams/pending` | `ORGANIZADOR` | Listar solicitudes pendientes. |
| GET | `/api/v1/teams/stats` | `ORGANIZADOR` | Consultar estadísticas de inscripciones. |
| GET | `/api/v1/teams/:id` | `ORGANIZADOR` | Consultar detalle de inscripción. |
| PATCH | `/api/v1/teams/:id/status` | `ORGANIZADOR` | Aprobar o rechazar una inscripción. |
| PATCH | `/api/v1/teams/:id/resubmit` | Capitán propietario | Corregir y reenviar una inscripción rechazada. |
| GET | `/api/v1/teams/:id/players` | `CAPITAN` propietario | Consultar plantilla. |
| POST | `/api/v1/teams/:id/players` | `CAPITAN` propietario | Agregar jugador. |
| PATCH | `/api/v1/teams/:id/players/:playerId/leave` | `CAPITAN` propietario | Registrar baja lógica de jugador. |

## Jornadas, partidos y calendario (H4–H6)

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| GET | `/api/v1/equipos/mis-partidos` | `JUGADOR` / `CAPITAN` | Consultar el calendario del equipo vinculado. |
| GET | `/api/v1/equipos-disponibles` | `ORGANIZADOR` | Listar equipos aprobados y habilitados para programación. |
| GET | `/api/v1/arbitros` | `ORGANIZADOR` | Listar árbitros disponibles. |
| GET | `/api/v1/jornadas` | `ORGANIZADOR` | Listar jornadas de la temporada activa. |
| POST | `/api/v1/jornadas` | `ORGANIZADOR` | Crear jornada en borrador. |
| GET | `/api/v1/jornadas/:id/partidos` | `ORGANIZADOR` | Consultar partidos de una jornada. |
| PATCH | `/api/v1/jornadas/:id/publicar` | `ORGANIZADOR` | Publicar una jornada. |
| POST | `/api/v1/partidos` | `ORGANIZADOR` | Programar un partido. |
| PATCH | `/api/v1/partidos/:id` | `ORGANIZADOR` | Modificar, suspender o cancelar según DTO y estado. |

## Arbitraje, marcador y resultados (H7–H8)

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| GET | `/api/v1/arbitro/mis-partidos` | `ARBITRO` | Consultar partidos asignados. |
| GET | `/api/v1/arbitro/partidos/:id` | Árbitro asignado | Consultar el panel arbitral. |
| PATCH | `/api/v1/partidos/:id/estado` | Árbitro asignado | Iniciar o finalizar el partido. |
| POST | `/api/v1/partidos/:id/eventos` | Árbitro asignado | Registrar gol, asistencia o tarjeta. |
| POST | `/api/v1/partidos/:id/participantes` | Árbitro asignado | Registrar jugadores participantes. |
| GET | `/api/v1/partidos/:id/marcador` | Público | Consultar marcador derivado de eventos. |
| GET | `/api/v1/partidos/resultados` | Público | Consultar resultados por jornada. |
| GET | `/api/v1/partidos/:id` | Público | Consultar detalle y cronología del partido. |

Las pantallas de calendario/marcador consultan periódicamente la API (polling de 5 segundos), según los criterios de H6–H8.

## Corrección, tabla y estadísticas (H9–H13)

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| GET | `/api/v1/partidos/:id/corregir` | `ORGANIZADOR` | Obtener detalle y eventos editables para corrección. |
| POST | `/api/v1/partidos/:id/corregir` | `ORGANIZADOR` | Aplicar corrección con justificación y auditoría. |
| GET | `/api/v1/tabla-posiciones` | Público | Consultar tabla calculada a partir de partidos finalizados. |
| PATCH | `/api/v1/tabla-posiciones` | Bloqueado | Rechaza edición manual de posiciones. |
| PUT | `/api/v1/tabla-posiciones` | Bloqueado | Rechaza edición manual de posiciones. |
| GET | `/api/v1/jugadores/mis-estadisticas` | `JUGADOR` / `CAPITAN` vinculado | Consultar estadísticas propias. |
| GET | `/api/v1/estadisticas/ranking?categoria=...&limit=10` | `ORGANIZADOR` | Consultar ranking por categoría. |

## Pagos de inscripción y control administrativo (H14–H15)

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| POST | `/api/v1/pagos` | `CAPITAN` | Procesar pago simulado de inscripción. |
| GET | `/api/v1/admin/pagos?estado=...` | `ORGANIZADOR` | Consultar estado de pagos. |
| PATCH | `/api/v1/admin/equipos/:id/suspension` | `ORGANIZADOR` | Suspender o reactivar equipo según estado y motivo. |

## Módulos H16–H23

El documento final de historias contempla notificaciones automáticas, galería multimedia, preferencias de notificación y reportes. En el ZIP de backend revisado existe un servicio interno de notificaciones y el modelo `Notification`, pero no se encontraron controladores públicos de bandeja/preferencias, controladores de galería ni controladores de reportes H22–H23. No se inventan rutas HTTP para estos módulos. Si se añadieron en commits posteriores, actualizar esta sección desde Swagger de la rama `main`.

## Uso de Swagger

1. Abrir `https://<dominio-api>/api/docs`.
2. Seleccionar **Authorize** e ingresar el access token Bearer para rutas privadas.
3. Elegir el módulo y ejecutar la operación.
4. No incluir tokens, contraseñas ni cadenas de conexión reales en capturas o ejemplos públicos.
