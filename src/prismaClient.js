export const runtime = "nodejs"
import pkg from "@prisma/client"
const { PrismaClient } = pkg

import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

export default prisma
