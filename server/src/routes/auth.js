import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";

const router = express.Router();

function signUserJwt(user) {
  return jwt.sign({ userId: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

router.post("/signup", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(8).max(20),
    rollNo: z.string().min(1).max(40),
    password: z.string().min(6)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });

  const { name, email, phone, rollNo, password } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, phone, rollNo, passwordHash, role: "user" });

  const token = signUserJwt(user);
  return res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, rollNo: user.rollNo, role: user.role }
  });
});

router.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signUserJwt(user);
  return res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, rollNo: user.rollNo, role: user.role }
  });
});

export default router;
