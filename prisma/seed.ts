import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Usuarios de prueba: uno por rol. El rol se fija explícitamente acá porque el
 * registro público (POST /users) siempre crea cuentas JUGADOR.
 */
const SEED_USERS = [
  { email: 'demo@example.com', password: 'Demo1234!', role: Role.JUGADOR },
  {
    email: 'organizador@liga.com',
    password: 'Admin123!',
    role: Role.ORGANIZADOR,
  },
  { email: 'arbitro1@liga.com', password: 'Arbitro123!', role: Role.ARBITRO },
  { email: 'capitan1@liga.com', password: 'Capitan123!', role: Role.CAPITAN },
  { email: 'jugador1@liga.com', password: 'Jugador123!', role: Role.JUGADOR },
];

/**
 * Temporada 2026. Los períodos son los definidos en el documento de historias:
 * inscripciones del 1 al 15 de noviembre de 2026 (fechas inclusivas).
 */
const SEASON = {
  name: 'Liga Mayor Amateur - Temporada 2026',
  startDate: new Date(2026, 10, 16),
  endDate: new Date(2027, 2, 31, 23, 59, 59, 999),
  registrationStart: new Date(2026, 10, 1),
  registrationEnd: new Date(2026, 10, 15, 23, 59, 59, 999),
  fee: '50.00',
};

async function seedUsers() {
  for (const { email, password, role } of SEED_USERS) {
    const passwordHash = await bcrypt.hash(password, 12);

    // `upsert` hace el seed idempotente. En `update` se reasigna el rol para
    // que volver a correr el seed corrija cuentas que quedaron con otro rol.
    const user = await prisma.user.upsert({
      where: { email },
      update: { role },
      create: { email, passwordHash, role },
    });
    console.log(`Usuario listo: ${user.email} (${user.role}) / ${password}`);
  }
}

async function seedSeason() {
  // Season no tiene un índice único por nombre, así que se busca a mano.
  const existing = await prisma.season.findFirst({
    where: { name: SEASON.name },
  });

  const season = existing
    ? await prisma.season.update({ where: { id: existing.id }, data: SEASON })
    : await prisma.season.create({ data: SEASON });

  console.log(`Temporada lista: ${season.name} (cuota $${season.fee})`);
}

try {
  await seedUsers();
  await seedSeason();
} finally {
  await prisma.$disconnect();
}