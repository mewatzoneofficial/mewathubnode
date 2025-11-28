import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";

// =============================
// Get all staff
// =============================
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
      roleID: req.query.roleID ? parseInt(req.query.roleID, 10) : null,
      status: req.query.status ? parseInt(req.query.status, 10) : null,
    };

    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push("admin.name LIKE ?");
      params.push(`%${filters.name}%`);
    }

    if (filters.email) {
      whereClauses.push("admin.email LIKE ?");
      params.push(`%${filters.email}%`);
    }

    if (filters.mobile) {
      whereClauses.push("admin.mobile LIKE ?");
      params.push(`%${filters.mobile}%`);
    }

    if (filters.roleID) {
      whereClauses.push("admin.roleID = ?");
      params.push(filters.roleID);
    }

    if (filters.status !== null) {
      whereClauses.push("admin.status = ?");
      params.push(filters.status);
    }

    const whereClause = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    const sqlQuery = `
      SELECT *
      FROM admin
      ${whereClause}
      ORDER BY adminID DESC
      LIMIT ? OFFSET ?;
    `;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);
    const staff = Array.isArray(results) ? results : [];

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM admin
      ${whereClause};
    `;

    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    const baseImageUrl = process.env.IMAGE_BASE_URL;

    const responseData = staff.map((s) => ({
      ...s,
      image: s.image ? `${baseImageUrl}staff/${s.image}` : null,
    }));

    return successResponse(res, "Staff fetched successfully", {
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

// =============================
// Get staff by ID
// =============================
export const getRecordById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid staff ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM admin WHERE adminID = ?", [id]);

    if (!result.length) {
      return errorResponse(res, "Staff not found", 404);
    }

    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const staff = result[0];

    const responseData = {
      ...staff,
      image: staff.image ? `${baseImageUrl}staff/${staff.image}` : null,
    };

    return successResponse(res, "Staff fetched successfully", responseData);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// =============================
// Create a new staff
// =============================
export const createRecord = async (req, res) => {
  const {
    name,
    email,
    mobile,
    roleID,
    designation,
    password,
    status,
  } = req.body;

  const image = req.file ? req.file.filename : null;

  if (!name || !email || !mobile) {
    return errorResponse(res, "Name, email, and mobile are required", 400);
  }

  const [existing] = await runQuery(
    "SELECT * FROM admin WHERE email = ? OR mobile = ?",
    [email, mobile]
  );

  if (existing.length > 0) {
    return errorResponse(res, "Staff with this email or mobile already exists", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO admin 
        (name, email, mobile, roleID, designation, password, status, image, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name,
        email,
        mobile,
        roleID || null,
        designation || null,
        password || null,
        status || 1,
        image || null,
      ]
    );

    return successResponse(res, "Staff created successfully", {
      adminID: result.insertId,
      name,
      email,
    });
  } catch (err) {
    console.error("Error creating staff:", err);
    return errorResponse(res, "Error creating staff", 500);
  }
};

// =============================
// Update staff by ID
// =============================
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    mobile,
    roleID,
    designation,
    password,
    status,
  } = req.body;

  const image = req.file ? req.file.filename : null;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid staff ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM admin WHERE adminID = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "Staff not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE admin SET 
        name = ?, 
        email = ?, 
        mobile = ?, 
        roleID = ?, 
        designation = ?, 
        password = COALESCE(?, password),
        status = ?, 
        image = COALESCE(?, image), 
        updated_at = NOW()
      WHERE adminID = ?`,
      [
        name,
        email,
        mobile,
        roleID || null,
        designation || null,
        password || null,
        status || 1,
        image,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the staff", 400);
    }

    return successResponse(res, "Staff updated successfully", { adminID: id });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// =============================
// Delete staff by ID
// =============================
export const deleteRecord = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid staff ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM admin WHERE adminID = ?", [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, "Staff not found", 404);
    }

    return successResponse(res, "Staff deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
