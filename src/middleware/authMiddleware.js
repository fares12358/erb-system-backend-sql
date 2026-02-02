import jwt from "jsonwebtoken"
import prisma from "../prismaClient.js"

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      })
    }

    req.user = user

    next()

  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    })
  }
}

export default protect
