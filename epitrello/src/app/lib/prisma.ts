// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

let prismaInstance: PrismaClient;

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

try {
  prismaInstance = globalForPrisma.prisma || new PrismaClient({ adapter })
  console.log("Prisma Client initialisé avec succès");
} catch (error) {
  console.error(" Erreur critique d'initialisation prisma")
  console.error(error)
  throw error
}



export const prisma = prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma