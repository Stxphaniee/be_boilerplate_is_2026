/**
 * Errores de dominio del módulo de equipos.
 *
 * Los lanza el repositorio cuando la base rechaza un insert por una restricción
 * única, y el servicio los traduce a excepciones HTTP. Así el repositorio no
 * conoce códigos de estado y el servicio no conoce los códigos de Prisma.
 *
 * Ojo: la propiedad no se llama `name` a propósito, porque `Error.name` ya
 * existe y la pisaría.
 */
export class TeamNameTakenError extends Error {
  constructor(public readonly teamName: string) {
    super(`Ya existe un equipo con el nombre "${teamName}" en la temporada.`);
    this.name = 'TeamNameTakenError';
  }
}

export class TeamShortNameTakenError extends Error {
  constructor(public readonly shortName: string) {
    super(`Ya existe un equipo con la sigla "${shortName}" en la temporada.`);
    this.name = 'TeamShortNameTakenError';
  }
}

export class CaptainAlreadyHasTeamError extends Error {
  constructor(public readonly captainId: string) {
    super('El capitán ya tiene un equipo inscrito en la temporada.');
    this.name = 'CaptainAlreadyHasTeamError';
  }
}

// =====================================================
// H3 - GESTIÓN DE PLANTILLA
// =====================================================

/**
 * Se lanza cuando se intenta agregar un jugador y la plantilla
 * ya alcanzó el máximo de 15 jugadores activos.
 */
export class RosterFullError extends Error {
  constructor() {
    super('La plantilla ya alcanzó el máximo de 15 jugadores.');
    this.name = 'RosterFullError';
  }
}

/**
 * Se lanza cuando una baja dejaría la plantilla con menos
 * de 5 jugadores activos.
 */
export class RosterTooSmallError extends Error {
  constructor() {
    super('No puedes dar de baja a un jugador si la plantilla quedaría con menos de 5.');
    this.name = 'RosterTooSmallError';
  }
}

/**
 * Se lanza cuando el DUI del jugador a agregar ya existe
 * en la base (restricción única global de Player.dui).
 */
export class PlayerDuplicateDuiError extends Error {
  constructor(public readonly dui: string) {
    super(`Ya existe un jugador registrado con el DUI "${dui}".`);
    this.name = 'PlayerDuplicateDuiError';
  }
}

/**
 * Se lanza cuando el número de camiseta ya está en uso
 * por otro jugador activo del mismo equipo.
 */
export class JerseyNumberTakenError extends Error {
  constructor(public readonly jerseyNumber: number) {
    super(`El número de camiseta ${jerseyNumber} ya está en uso en la plantilla.`);
    this.name = 'JerseyNumberTakenError';
  }
}