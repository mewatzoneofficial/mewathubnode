import bcrypt from "bcrypt";
import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";

// Get all admins
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      name: trimOrNull(req.query.name),
      email: trimOrNull(req.query.email),
      mobile: trimOrNull(req.query.mobile),
    };

    // Build WHERE clause dynamically
    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push("name LIKE ?");
      params.push(`%${filters.name}%`);
    }

    if (filters.email) {
      whereClauses.push("(email LIKE ? OR official_email LIKE ?)");
      params.push(`%${filters.email}%`, `%${filters.email}%`);
    }

    if (filters.mobile) {
      whereClauses.push("(mobile LIKE ? OR official_mobile LIKE ?)");
      params.push(`%${filters.mobile}%`, `%${filters.mobile}%`);
    }

    const whereClause = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";
    const sqlQuery = `
      SELECT adminID, name, mobile, email, official_email, official_mobile, image, dob, joining_date,
       gender, created_at FROM admin
      ${whereClause}
      ORDER BY adminID DESC LIMIT ? OFFSET ?`;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) AS total FROM admin ${whereClause}`;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    return successResponse(res, "Data fetched successfully", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      results, 
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message, 500);
  }
};

// Get admin by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid admin ID", 400);
  }
  try {
    const result = await runQuery("SELECT * FROM admin WHERE adminID = ?", [id]);
    if (result.length === 0) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "Data fetched successfully", result[0]);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const createRecord = async (req, res) => {
  const { name, mobile, email, official_email, official_mobile, password, dob, joining_date, gender } = req.body;

  if (!name || !email || !mobile || !password) {
    return errorResponse(res, "Name, email, mobile, and password are required", 400);
  }

  try {
    const existing = await runQuery(
      "SELECT adminID FROM admin WHERE email = ? OR mobile = ?", 
      [email, mobile]
    );
    if (result.affectedRows === 0) {
      return errorResponse(res, "Email or mobile already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await runQuery(
      `INSERT INTO admin 
       (name, email, mobile, password, official_email, official_mobile, dob, joining_date, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, mobile, hashedPassword, official_email || null, official_mobile || null, dob || null, joining_date || null, gender || null]
    );

    return successResponse(res, "Admin created successfully", { adminID: result.insertId });
  } catch (err) {
    console.error("Error creating admin:", err);
    return errorResponse(res, "Error creating admin", 500);
  }
};


// Update admin by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile } = req.body;

  if (!name || !email || !mobile) {
    return errorResponse(res, "Name, email, and mobile are required to update", 400);
  }

  try {
    const result = await runQuery(
      "UPDATE admin SET name = ?, email = ?, mobile = ? WHERE adminID = ?",
      [name, email, mobile, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "Admin not found", 404);
    }

    return successResponse(res, "User Updated successfully" , { id, name, email, mobile });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Delete admin by ID
export const deleteRecord = async (req, res) => {
  const { id } = req.params;
  console.log("Deleting admin with ID:", id);

  try {
    const result = await runQuery("DELETE FROM admin WHERE adminID = ?", [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, "Admin not found", 404);
    }

    return successResponse(res, { message: "User deleted successfully" });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
