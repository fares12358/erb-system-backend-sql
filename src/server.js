import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"

import authRoutes from "./routes/authRoutes.js"
import invoiceRoutes from "./routes/invoiceRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
export const runtime = "nodejs"

dotenv.config()

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
)

app.use("/api/auth", authRoutes)
app.use("/api/invoices", invoiceRoutes)
app.use("/api/dashboard", dashboardRoutes)

const PORT = process.env.PORT || 5000

app.get('/', (req, res) => {
  res.send('Hello, Backend!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
