
console.log('DATABASE_URL at prisma.ts:', process.env.DATABASE_URL);
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
