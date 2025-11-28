import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";
import bcrypt from "bcryptjs";

// Get all users
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      name: trimOrNull(req.query.name),
      email: trimOrNull(req.query.email),
      phone: trimOrNull(req.query.phone)
    };

    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push("name LIKE ?");
      params.push(`%${filters.name}%`);
    }

    if (filters.email) {
      whereClauses.push("email LIKE ?");
      params.push(`%${filters.email}%`);
    }

    // if (filters.phone) {
    //   whereClauses.push("phone LIKE ?");
    //   params.push(`%${filters.phone}%`);
    // }

    const whereClause = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    const sqlQuery = `
      SELECT * FROM users
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    const baseImageUrl = process.env.IMAGE_BASE_URL;

    const responseData = results.map((user) => ({
      ...user,
      image: user.image ? `${baseImageUrl}uploads/users/${user.image}` : null,
    }));

    return successResponse(res, "Users fetched successfully", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      responseData,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message, 500);
  }
};


// Get user by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM users WHERE id = ?", [id]);

    if (!result.length) {
      return errorResponse(res, "User not found", 404);
    }

    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const user = result[0];

    const responseData = {
      ...user,
      image: user.image
        ? `${baseImageUrl}uploads/users/${user.image}`
        : null,
    };
    return successResponse(res, "User fetched successfully", responseData);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// Create a new user
export const createRecord = async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    description,
    age,
    gender,
    latitude,
    longitude
  } = req.body;

  const image = req.file ? req.file.filename : null;

  if (!name || !email || !password) {
    return errorResponse(res, "Name, email, and password are required", 400);
  }

  const [existing] = await runQuery("SELECT * FROM users WHERE email = ?", [email]);
  if (existing.length > 0) { 
    return errorResponse(res, "User already exists", 409);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await runQuery(
      `INSERT INTO users 
       (name, email, phone, password, image, description, age, gender, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phone || null,
        hashedPassword,
        image || null,
        description || null,
        age || null,
        gender || null,
        latitude || null,
        longitude || null
      ]
    );

    return successResponse(res, "User created successfully", { id: result.insertId, name, email });
  } catch (err) {
    console.error("Error creating user:", err);
    return errorResponse(res, "Error creating user", 500);
  }
};


// Update user by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    password,
    description,
    age,
    gender,
    latitude,
    longitude
  } = req.body || {};

  const image = req.file ? req.file.filename : null;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM users WHERE id = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "User not found", 404);
    }

    let finalPassword = existing[0].password;

    if (password) {
      finalPassword = await bcrypt.hash(password, 10);
    }

    const [result] = await runQuery(
      `UPDATE users SET 
        name = ?, 
        email = ?, 
        phone = ?, 
        password = ?, 
        image = COALESCE(?, image), 
        description = ?, 
        age = ?, 
        gender = ?, 
        latitude = ?, 
        longitude = ?, 
        updated_at = NOW()
      WHERE id = ?`,
      [
        name,
        email,
        phone,
        finalPassword,
        image,
        description,
        age,
        gender,
        latitude,
        longitude,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the user", 400);
    }
    return successResponse(res, "User updated successfully", { id, name, email });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// Delete user by ID
export const deleteRecord = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid user ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "User deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
