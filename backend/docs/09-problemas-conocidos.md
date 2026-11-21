# 09. Problemas conocidos, limitaciones y pendientes

Este documento registra observaciones reales del desarrollo y del intento de publicación. No constituye una declaración de que todas las historias estén implementadas ni sustituye la verificación del sistema.

## 1. Backend en Vercel responde 500 (bloqueante)

**Estado:** abierto en el último registro disponible.  
**Impacto:** impide login real y operaciones que dependan de la API; aunque el frontend esté publicado, el sistema no queda completamente disponible.

**Reproducción:** ejecutar `curl -i https://liga-futbol-backend.vercel.app/api/v1/partidos/resultados`.

**Resultado observado:** `500 Internal Server Error` con `X-Vercel-Error: INTERNAL_FUNCTION_INVOCATION_FAILED` en la prueba más reciente compartida. En registros anteriores aparecieron tanto variables de entorno faltantes (`DATABASE_URL`, `JWT_SECRET`) como un `ERR_INVALID_MODULE_SPECIFIER` relacionado con el alias `@Prisma`. Los registros más recientes no muestran el stack trace de la excepción actual; por eso no se afirma una causa única.

**Mitigación pendiente:** inspeccionar el log completo y fuente del módulo inválido, corregir solo el arranque necesario, volver a desplegar, probar health y Swagger; o migrar la API a servicio Node persistente compatible, manteniendo HTTPS.

## 2. Migraciones de PostgreSQL en Neon no verificadas

**Estado:** pendiente de comprobación.  
**Reproducción posible:** las consultas fallarán si faltan tablas o columnas en `neondb`.  
**Acción:** ejecutar `npm run prisma:deploy` apuntando a Neon, revisar salida y confirmar esquema y datos semilla. No usar `migrate reset` en la base remota.

## 3. BOM en una migración SQL de notificaciones

**Estado:** corregido en el entorno local durante el desarrollo; **confirmación en main pendiente**.  
**Síntoma:** `P3018`, error PostgreSQL 42601, carácter `\u{feff}` al inicio de `migration.sql`, seguido de `P3009` por migración fallida.  
**Acción:** asegurar codificación UTF-8 sin BOM y recuperar el estado de migración mediante procedimiento de Prisma, verificando previamente si hubo SQL aplicado parcialmente. Coordinar con equipo por historial/checksum.

## 4. Rutas dinámicas de Next.js en ZIP anterior a integración final

**Estado:** versiones antiguas observadas en archivos facilitados.  
**Detalles:** en un ZIP se encontraban rutas como `app/arbitro/[id]/page.tsx` y `app/admin/partidos/nuevo/[id]/editar/page.tsx`, mientras los enlaces de interfaz apuntaban a otras rutas. Se trabajó una corrección posterior, pero es necesario comprobar `main` para evitar 404.

## 5. Capturas de documentación

**Estado:** documentación textual preparada; capturas reales del sistema ejecutado no incluidas en los materiales que se pudieron recuperar.  
**Acción:** registrar pantallas reales del despliegue en la guía de uso. No reemplazar capturas de producto por mockups sin etiquetarlos.

## 6. Evidencias de PR, Trello y release

**Estado:** enlaces de Pull Requests por historia, URL del tablero y etiquetas/release no confirmados en materiales disponibles.  
**Acción:** comprobar GitHub/Trello y vincular datos reales; no presentar como «aprobado» un merge directo sin PR.

## 7. Usuarios y contraseñas de demostración

El `seed.ts` de la copia compartida incluye contraseñas predeterminadas para desarrollo e imprime credenciales. Esto es apropiado únicamente en una base controlada de pruebas. **No ejecutar ese seed sin revisión sobre un servicio público abierto**. Cambiar las credenciales, no subirlas a GitHub y entregarlas solo por Moodle.

## 8. Alcance de los módulos posteriores

En el ZIP de backend revisado sí aparecen controladores y servicios para H9–H15: corrección de resultados, tabla de posiciones, estadísticas individuales, ranking y pagos. El estado final de integración debe confirmarse en `main` y en el despliegue.

Para H16–H23, el material revisado contiene el modelo/servicio interno de notificaciones, pero no se encontraron controladores HTTP de bandeja y preferencias, modelo/controlador de galería multimedia ni controladores de reportes. Si estos módulos se incorporaron en commits posteriores al ZIP revisado, actualizar esta sección desde el código de `main` y Swagger.


## Nota sobre el supuesto de funcionamiento para la guía de uso

La guía de uso describe los flujos funcionales esperados de la versión 1.0.0. La incidencia de Vercel aquí registrada es histórica y debe cambiarse a **Resuelta** únicamente después de ejecutar una prueba HTTP satisfactoria del health check, Swagger y los endpoints principales desde el dominio de producción. Si el último redeploy ya corrigió el error, actualizar este documento con fecha y evidencia de la verificación.
