/**
 * Auth Routes – Signup, Login, Profile management
 * 
 * POST /api/auth/signup   – Create account
 * POST /api/auth/login    – Login and receive JWT
 * GET  /api/auth/me       – Get current user profile
 * PUT  /api/auth/profile  – Update profile
 */
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "rebook-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 12;

/** Allowed college email domains */
const ALLOWED_DOMAINS = [".edu", ".ac.in", ".edu.in"];

function isCollegeEmail(email) {
  return ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** POST /api/auth/signup */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name, department, semester, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (!isCollegeEmail(email)) {
      return res.status(400).json({ error: "Please use your college email address (.edu, .ac.in, .edu.in)" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: "Password must contain an uppercase letter" });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must contain a number" });
    }

    // Check if user already exists
    const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userRole = role === "seller" ? "seller" : "buyer";

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, department, semester, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, department, semester, role, avatar_url, created_at`,
      [email.toLowerCase(), passwordHash, full_name || "", department || "", semester || 1, userRole]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

/** POST /api/auth/login */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/** GET /api/auth/me – Get current user profile */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, email, full_name, department, semester, role, avatar_url, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/** PUT /api/auth/profile – Update profile */
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { full_name, department, semester, avatar_url } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
    if (department !== undefined) { updates.push(`department = $${idx++}`); values.push(department); }
    if (semester !== undefined) { updates.push(`semester = $${idx++}`); values.push(semester); }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatar_url); }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.user.id);
    const result = await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}
       RETURNING id, email, full_name, department, semester, role, avatar_url, created_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
