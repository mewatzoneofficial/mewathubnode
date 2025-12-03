import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";

// Get all records (employers)
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      name: trimOrNull(req.query.name),
      username: trimOrNull(req.query.username),
      email: trimOrNull(req.query.email),
      status: trimOrNull(req.query.status),
    };

    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push("name LIKE ?");
      params.push(`%${filters.name}%`);
    }
    if (filters.username) {
      whereClauses.push("username LIKE ?");
      params.push(`%${filters.username}%`);
    }
    if (filters.email) {
      whereClauses.push("email LIKE ?");
      params.push(`%${filters.email}%`);
    }
    if (filters.status) {
      whereClauses.push("status = ?");
      params.push(filters.status);
    }

    const whereClause = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";

    const sqlQuery = `
      SELECT employerID, emp_eny_id, created_by, name, username, official_name, designation, email, mobile,
             password, otp, status, pay_status, info_verified, updated_at, otpchk, created_at, employertype,
             signuptype, level, brand_level, devicetoken, devicetype, category, fcm_token, approval_date,
             approved_by, email_verified, phone_verified, email_verified_otp, phone_verified_otp, gst, logo,
             featured, lead, approval_status, hide_status, is_deleted, payment_preference
      FROM employer_user
      ${whereClause}
      ORDER BY employerID DESC
      LIMIT ? OFFSET ?;
    `;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);
    const records = Array.isArray(results) ? results : [];

    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const responseData = records.map((record) => ({
      ...record,
      logo: record.logo ? `${baseImageUrl}employer/${record.logo}` : null,
    }));

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM employer_user
      ${whereClause};
    `;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    return successResponse(res, "Records fetched successfully", {
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

// Get record by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid ID", 400);
  }

  try {
    const [result] = await runQuery(
      "SELECT * FROM employer_user WHERE employerID = ?",
      [id]
    );

    if (!result.length) {
      return errorResponse(res, "Record not found", 404);
    }

    return successResponse(res, "Record fetched successfully", result[0]);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Create a new record
export const createRecord = async (req, res) => {
  const { name, username, email, mobile, password, employertype } = req.body;

  if (!name || !username || !email || !password) {
    return errorResponse(res, "Name, username, email, and password are required", 400);
  }

  const [existing] = await runQuery("SELECT * FROM employer_user WHERE email = ?", [email]);
  if (existing.length > 0) {
    return errorResponse(res, "Record already exists", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO employer_user
       (name, username, email, mobile, password, employertype, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [name, username, email, mobile || null, password, employertype || null]
    );

    return successResponse(res, "Record created successfully", { id: result.insertId, name, email });
  } catch (err) {
    console.error("Error creating record:", err);
    return errorResponse(res, "Error creating record", 500);
  }
};

// Update record by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { name, username, email, mobile, password, employertype, status } = req.body || {};

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM employer_user WHERE employerID = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "Record not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE employer_user SET
        name = ?, username = ?, email = ?, mobile = ?, password = COALESCE(?, password),
        employertype = ?, status = ?, updated_at = NOW()
      WHERE employerID = ?`,
      [name, username, email, mobile, password, employertype, status, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made", 400);
    }

    return successResponse(res, "Record updated successfully", { id });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Delete record by ID
export const deleteRecord = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM employer_user WHERE employerID = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "Record not found", 404);
    }

    return successResponse(res, "Record deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
