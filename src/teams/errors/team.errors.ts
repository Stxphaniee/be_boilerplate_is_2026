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
