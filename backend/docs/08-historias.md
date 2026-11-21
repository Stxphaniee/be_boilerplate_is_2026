# 08. Historias de usuario y trazabilidad

## Criterios para considerar terminada una historia

Según el formato de entrega de la cátedra, una historia está **terminada** únicamente si existe PR aprobado y fusionado a `develop`, está incluida en `main` con versión `v1.0.0`, funciona en el ambiente desplegado y su tarjeta está en **Hecho** con enlace al PR. Un relato de implementación o un mockup por sí solos no cumplen ese criterio.

## Inventario de las 23 historias aprobadas

El listado de títulos y responsables procede del documento de historias del equipo. El equipo comunicó el cierre del desarrollo y la integración final en `main`. Para la evaluación, cada historia debe conservar el enlace verificable a su PR aprobado y a su tarjeta Trello. La documentación no inventa números de PR ni enlaces de tarjetas que no fueron compartidos.

| ID | Historia | Módulo | Responsable | Estado documentado |
|---|---|---|---|---|
| H1 | Inscripción de equipo y plantilla | Módulo 1 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H2 | Validación de elegibilidad de inscripción | Módulo 1 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H3 | Gestión de altas y bajas de jugadores en plantilla | Módulo 1 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H4 | Programación manual de partidos | Módulo 2 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H5 | Modificación o cancelación de partidos programados | Módulo 2 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H6 | Consulta de calendario de partidos | Módulo 2 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H7 | Actualización de marcador en vivo y eventos del partido | Módulo 3 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H8 | Consulta de resultados oficiales y vista pública | Módulo 3 | José Miguel Ramírez Ramírez | Implementación reportada; producción sin validar |
| H9 | Corrección administrativa de resultados | Módulo 3 | Orlando Antonio Valdez Sibrian | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H10 | Cálculo de tabla de posiciones | Módulo 4 | Orlando Antonio Valdez Sibrian | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H11 | Visualización de la tabla de posiciones | Módulo 4 | Orlando Antonio Valdez Sibrian | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H12 | Consulta de estadísticas individuales | Módulo 5 | Orlando Antonio Valdez Sibrian | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H13 | Identificación y ranking de jugadores destacados | Módulo 5 | Orlando Antonio Valdez Sibrian | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H14 | Pago de cuota de inscripción con pasarela simulada | Módulo 6 | Orlando Antonio Valdez Sibrian | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H15 | Consulta de estado de pagos y suspensión por mora | Módulo 6 | Orlando Antonio Valdez Sibrian | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H16 | Notificación de cambios en partidos | Módulo 7 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H17 | Notificación de publicación de jornada | Módulo 7 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H18 | Subida de contenido multimedia | Módulo 8 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H19 | Visualización de galería de partido | Módulo 8 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H20 | Bandeja de entrada centralizada y servicio de avisos | Módulo 9 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H21 | Configuración de preferencias de notificación | Módulo 9 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H22 | Reporte consolidado de pagos y estado financiero | Módulo 10 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |
| H23 | Reporte de estadísticas generales de la temporada | Módulo 10 | Stephanie Aracely Echeverria Cuellar | Implementación reportada por el equipo; falta enlazar PR y tarjeta Trello |

## Evidencias por historia

Cada ficha debe asociar la tarjeta Trello y el PR correspondiente. Como esos identificadores no constan en los materiales disponibles, se proporciona una ruta para revisar los PR reales sin atribuir números inventados:

- [Revisar Pull Requests de backend](https://github.com/Stxphaniee/be_boilerplate_is_2026/pulls?q=is%3Apr)
- [Revisar Pull Requests de frontend](https://github.com/Stxphaniee/fe_boilerplate_is_2026/pulls?q=is%3Apr)
- Tablero Trello: enlace no proporcionado en archivos disponibles.

## Avance funcional H1–H8

| Historia | Evidencia técnica observada o comunicada |
|---|---|
| H1 | Modelos Team/Player, POST `/teams`, vista de inscripción y consulta de equipo. |
| H2 | Endpoints de solicitudes pendientes, estadísticas, validación y reenvío. |
| H3 | Endpoints de alta y baja de jugadores y componentes de plantilla. |
| H4 | Modelos Round/Match, jornadas, partidos, publicación y asignación arbitral. |
| H5 | Actualización de partidos y vista de edición/suspensión. |
| H6 | Calendario personal, endpoint `equipos/mis-partidos` y polling. |
| H7 | Partidos del árbitro, eventos de gol/tarjetas/asistencias, participantes y cierre. |
| H8 | Código de consulta pública de resultados y detalle comunicado; no incluido en el ZIP del backend anterior a esos commits. |

## Evidencias pendientes para cerrar la trazabilidad

H9–H23 corresponden al trabajo de otros integrantes. Se conoce su asignación y diseño, pero **no** se entregaron aquí el estado definitivo de sus PR, sus tarjetas ni una verificación de producción. Por lo tanto, no se afirma que estén terminadas ni se inventa un motivo de atraso. La condición general de despliegue afecta la validación de todas las historias.

## Revisión de cierre de versión

- Confirmar la release `v1.0.0` en backend y frontend.
- Confirmar que las ramas `main` y `develop` incluyen la release aprobada.
- Revisar que cada historia terminada tenga PR aprobado por otro integrante y tarjeta enlazada.
- Registrar historias incompletas y la causa real; no declarar «Ninguna» sin verificar.


## Estado de aceptación

La tabla anterior resume la asignación y el estado reportado. Una historia solo debe marcarse como terminada para la cátedra cuando cumple simultáneamente: PR aprobado por otro integrante, merge a `develop`, inclusión en `main`/release `v1.0.0`, tarjeta Trello en **Hecho** con enlace al PR y funcionamiento comprobado en el despliegue.
