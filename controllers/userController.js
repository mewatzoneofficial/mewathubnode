import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";

// =============================
// Get all faculty users
// =============================
export const getAllRecords = async (req, res) => {
  try {
    // Parse pagination params safely
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
    const offset = (page - 1) * limit;

    // Helper to trim or nullify empty strings
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    // Filters
    const filters = {
      name: trimOrNull(req.query.name),
      email: trimOrNull(req.query.email),
      mobile: trimOrNull(req.query.mobile)
    };

    // Build WHERE clause dynamically
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
    if (filters.mobile) {
      whereClauses.push("mobile LIKE ?");
      params.push(`%${filters.mobile}%`);
    }
    const whereClause = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    // Fetch paginated results
    const sqlQuery = `
      SELECT *
      FROM faculity_users
      ${whereClause}
      ORDER BY faculityID DESC
      LIMIT ? OFFSET ?;
    `;
    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);
    const records = Array.isArray(results) ? results : [];

    // Fetch total count for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM faculity_users
      ${whereClause};
    `;
    const [countResult] = await runQuery(countQuery, params);
    const totalRow = Array.isArray(countResult) ? countResult[0] : countResult;
    const total = totalRow?.total || 0;

    // Build response data with image URLs
    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const responseData = records.map((record) => ({
      ...record,
      logo: record.logo ? `${baseImageUrl}users/${record.logo}` : null,
    }));

    return successResponse(res, "Faculty users fetched successfully", {
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
// Get faculty user by ID
// =============================
export const getRecordById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid faculty ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM faculity_users WHERE faculityID = ?", [id]);

    if (!result.length) {
      return errorResponse(res, "Faculty user not found", 404);
    }

    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const user = result[0];

    const responseData = {
      ...user,
      image: user.image ? `${baseImageUrl}faculty/${user.image}` : null,
    };

    return successResponse(res, "Faculty user fetched successfully", responseData);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// =============================
// Create a new faculty user
// =============================
export const createRecord = async (req, res) => {
  const { name, email, mobile, status } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!name || !email || !mobile) {
    return errorResponse(res, "Name, email, and mobile are required", 400);
  }

  const [existing] = await runQuery(
    "SELECT * FROM faculity_users WHERE email = ? OR mobile = ?",
    [email, mobile]
  );

  if (existing.length > 0) {
    return errorResponse(res, "User with this email or mobile already exists", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO faculity_users 
        (name, email, mobile, status, image, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [name, email, mobile, status || 1, image || null]
    );

    return successResponse(res, "Faculty user created successfully", {
      faculityID: result.insertId,
      name,
      email,
    });
  } catch (err) {
    console.error("Error creating faculty user:", err);
    return errorResponse(res, "Error creating faculty user", 500);
  }
};

// =============================
// Update faculty user by ID
// =============================
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, status } = req.body;

  const image = req.file ? req.file.filename : null;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid faculty ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM faculity_users WHERE faculityID = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "Faculty user not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE faculity_users SET 
        name = ?, 
        email = ?, 
        mobile = ?, 
        status = ?, 
        image = COALESCE(?, image), 
        updated_at = NOW()
      WHERE faculityID = ?`,
      [name, email, mobile, status || 1, image, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the user", 400);
    }

    return successResponse(res, "Faculty user updated successfully", { faculityID: id });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// =============================
// Delete faculty user by ID
// =============================
export const deleteRecord = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid faculty ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM faculity_users WHERE faculityID = ?", [id]);

    if (result.affectedRows === 0) {
      return errorResponse(res, "Faculty user not found", 404);
    }

    return successResponse(res, "Faculty user deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
