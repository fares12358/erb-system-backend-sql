import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../prismaClient.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";

/* ================= REGISTER ================= */
export const register = async (req, res) => {
  try {
    const { email } = req.body;

    const exist = await prisma.user.findUnique({ where: { email } });
    if (exist) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp.upsert({
      where: { email },
      update: { otp, expireAt },
      create: { email, otp, expireAt }
    });

    await sendEmail(email, "Verify your email", `<h2>Your OTP is: ${otp}</h2>`);

    res.json({ success: true, message: "OTP sent to email" });

  } catch (err) {
    console.log(err);
    
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= VERIFY OTP ================= */
export const verifyOtp = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    const record = await prisma.otp.findUnique({ where: { email } });

    if (!record || record.otp !== otp || record.expireAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        isVerified: true
      }
    });

    await prisma.otp.delete({ where: { email } });

    res.json({
      success: true,
      message: "Account created successfully",
      data: { id: user.id, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: "Verify email first" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    sendToken(user, res);

    res.json({
      success: true,
      message: "Logged in successfully",
      data: { id: user.id, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= FORGET PASSWORD ================= */
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({ success: true, message: "If email exists, reset link sent" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetExpire: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    const link = `${process.env.CLIENT_URL}/reset-password/${token}`;

    await sendEmail(user.email, "Reset Password", `<a href="${link}">Reset Password</a>`);

    res.json({ success: true, message: "Reset link sent to email" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: req.params.token,
        resetExpire: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(req.body.password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetExpire: null
      }
    });

    res.json({ success: true, message: "Password updated successfully" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= ME ================= */
export const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

/* ================= LOGOUT ================= */
export const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });

  res.json({ success: true, message: "Logged out successfully" });
};
