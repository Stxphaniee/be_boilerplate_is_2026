# Liga Amateur — Plataforma de gestión deportiva

**Universidad Centroamericana «José Simeón Cañas» (UCA)** · Departamento de Electrónica e Informática  
**Ingeniería de Software · Ciclo 02/2026 · Sección 01 · Proyecto 5**  
**Equipo:** Tres Tristes Tigres · **Versión documental:** 1.0.0 (referencia de entrega)

## Descripción

Plataforma web para administrar la inscripción de equipos y plantillas, validar solicitudes, organizar jornadas y partidos, registrar incidencias arbitrales y consultar resultados en vivo y oficiales. El proyecto distingue las operaciones de organizadores, capitanes, jugadores y árbitros, además de permitir ciertas consultas públicas para aficionados.

El backend usa **NestJS 12, Prisma 7 y PostgreSQL**; el frontend usa **Next.js 16, React 19, TypeScript y Tailwind CSS**. La comunicación entre ambas aplicaciones es HTTP/JSON; las vistas de calendario y marcador consultan la API periódicamente.

## Integrantes y responsabilidades asignadas

| Integrante | Historias asignadas | Alcance |
|---|---|---|
| José Miguel Ramírez Ramírez | H1–H8 | Inscripciones, calendario, arbitraje en vivo y resultados públicos |
| Orlando Antonio Valdez Sibrian | H9–H15 | Corrección de resultados, clasificaciones, estadísticas y pagos |
| Stephanie Aracely Echeverria Cuellar | H16–H23 | Notificaciones, galería y reportes |

**Cátedra:** Ing. Nelson Giovanni Castro Rodas e Ing. Luisa Daniela Arévalo Rodas.

## Repositorios y despliegue

- [Repositorio backend](https://github.com/Stxphaniee/be_boilerplate_is_2026)
- [Repositorio frontend](https://github.com/Stxphaniee/fe_boilerplate_is_2026)
- **Frontend público:** `https://<DOMINIO-FRONTEND>.vercel.app` (sustituir por el dominio de producción confirmado en Vercel; no se encontró una URL verificable en los materiales disponibles).
- **Backend asignado en Vercel:** [https://liga-futbol-backend.vercel.app](https://liga-futbol-backend.vercel.app).
- **Swagger previsto por `src/main.ts`:** [https://liga-futbol-backend.vercel.app/api/docs](https://liga-futbol-backend.vercel.app/api/docs).
- **Base de la API:** `https://liga-futbol-backend.vercel.app/api/v1`.
- **Verificación:** el dominio fue asignado como Production, pero una prueba HTTP posterior devolvió 500. La documentación describe la arquitectura objetivo; antes de declarar el sistema operativo se debe confirmar que health check, Swagger y endpoints responden correctamente.
- **Base de datos:** Neon PostgreSQL, proyecto `liga-amateur`, rama `production`; falta confirmar la aplicación de migraciones y datos semilla.

> La documentación se preparó tomando como base el documento final de historias, el formato de entrega y los ZIP disponibles de frontend/backend. Cuando un dato no pudo verificarse (dominio del frontend, enlace de Trello, PR por historia o estado real de producción), se deja indicado en lugar de inventarlo.

## Índice de documentación

1. [Guía de uso](docs/01-guia-de-uso.md)
2. [Arquitectura](docs/02-arquitectura.md)
3. [Modelo de datos](docs/03-modelo-de-datos.md)
4. [API REST](docs/04-api.md)
5. [Instalación local](docs/05-instalacion-local.md)
6. [Despliegue](docs/06-despliegue.md)
7. [Forma de trabajo](docs/07-forma-de-trabajo.md)
8. [Historias y trazabilidad](docs/08-historias.md)
9. [Problemas conocidos](docs/09-problemas-conocidos.md)

## Recorrido básico

1. Registrarse/iniciar sesión.
2. El capitán registra equipo y jugadores; el organizador valida la solicitud.
3. El organizador programa partidos y publica jornadas.
4. El jugador o capitán consulta su calendario.
5. El árbitro asignado inicia el encuentro, registra eventos/participantes y finaliza.
6. Cualquier visitante consulta los resultados que la API hace públicos.

## Seguridad y datos de demostración

Las rutas privadas del backend requieren JWT y validación de roles. Los secretos se configuran con variables de entorno: **no subir `.env`, contraseñas de prueba ni cadenas de conexión a GitHub**. Los usuarios de evaluación se entregan únicamente en Moodle. El archivo `prisma/seed.ts` del repositorio contiene una base para el sembrado local y debe revisarse para evitar contraseñas predeterminadas en producción.

## Ejecución local resumida

```bash
# Backend
cp .env.example .env
npm ci
docker compose up -d postgres
npm run prisma:deploy
npm run prisma:generate
npm run db:seed
npm run start:dev

# Frontend (otra terminal y otro repositorio)
cp .env.example .env.local
npm ci
npm run dev
```

Véase [instalación local](docs/05-instalacion-local.md) para detalles y consideraciones por entorno. Los comandos no sustituyen la configuración correcta de `.env`.
