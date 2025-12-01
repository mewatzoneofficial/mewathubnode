import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";

export const register = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Request body is missing" });
  }

  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return errorResponse(res, "All fields are required", 400);
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return errorResponse(res, "Invalid email format", 400);
  }

  try {
    const [rows] = await runQuery(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );

    if (rows.length > 0) {
      return errorResponse(res, "Email already registered", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await runQuery(
      `INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`,
      [name, email, phone, hashedPassword]
    );

    return successResponse(res, "User registered successfully", {
      id: result.insertId,
      name,
      email,
      phone,
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return errorResponse(res, "Error registering user", 500);
  }
};

export const login = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Request body is missing" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, "Email and password are required", 400);
  }

  try {
    const [rows] = await runQuery(
      `SELECT id, name, email, phone, password FROM users WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return successResponse(res, "User logged in successfully", {
      ...user,
      token,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return errorResponse(res, "Error logging in user", 500);
  }
};



export const adminLogin = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Request body is missing" });
  }

  const { email, password } = req.body;
  console.log("req.body", req.body)

  if (!email || !password) {
    return errorResponse(res, "Email and password are required", 400);
  }

  try {
    const [rows] = await runQuery(
      `SELECT adminID, name, email, password FROM admin WHERE email = ?`,
      [email]
    );

    // ❌ If email not found
    if (rows.length === 0) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    const admin = rows[0];
    console.log("admin", admin)

    const storedHash = admin.password.replace(/^\$2y/, '$2a');
    const isMatch = await bcrypt.compare(password, storedHash);

    // ❌ If password does not match
    if (!isMatch) {
      return errorResponse(res, "Passwords do not match", 401);
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const token = jwt.sign(
      {
        id: admin.adminID,
        name: admin.name,
        email: admin.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return successResponse(res, "Admin logged in successfully", {
      adminID: admin.adminID,
      name: admin.name,
      email: admin.email,
      token,
    });

  } catch (err) {
    console.error("Login error:", err.message);
    return errorResponse(res, "Error logging in admin", 500);
  }
};
