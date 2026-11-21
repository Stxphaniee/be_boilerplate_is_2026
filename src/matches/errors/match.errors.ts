export class RoundAlreadyPublishedError extends Error {
  constructor() {
    super('La jornada ya fue publicada y no admite nuevas programaciones.');
    this.name = 'RoundAlreadyPublishedError';
  }
}

export class CourtOverlapError extends Error {
  constructor(public readonly court: string) {
    super(`La cancha ${court} ya está ocupada en ese intervalo.`);
    this.name = 'CourtOverlapError';
  }
}

export class TeamOverlapError extends Error {
  constructor(public readonly teamId: string) {
    super(`Uno de los equipos ya tiene un partido en ese intervalo.`);
    this.name = 'TeamOverlapError';
  }
}

export class DuplicateFixtureError extends Error {
  constructor() {
    super('Este enfrentamiento ya está programado en la jornada.');
    this.name = 'DuplicateFixtureError';
  }
}