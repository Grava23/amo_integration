import type { PrismaClient } from "../generated/prisma/client.ts"
import type { AmoClient } from "../infra/amo/client.ts"

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient
    amoClient: AmoClient
  }
}

