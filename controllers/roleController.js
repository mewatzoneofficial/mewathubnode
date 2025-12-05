import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";

// Get all states
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      name: trimOrNull(req.query.name),
    };

    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push("name LIKE ?");
      params.push(`%${filters.name}%`);
    }

    const whereClause = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    const sqlQuery = `
      SELECT * FROM admin_roles
      ${whereClause}
      ORDER BY roleID DESC
      LIMIT ? OFFSET ?;
    `;

    const [responseData] = await runQuery(sqlQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) AS total FROM admin_roles ${whereClause}`;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    return successResponse(res, "states fetched successfully", {
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


// Get states by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid states ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM states WHERE id = ?", [id]);
    if (!result.length) {
      return errorResponse(res, "states not found", 404);
    }

    return successResponse(res, "states fetched successfully", result[0]);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Create a new states
export const createRecord = async (req, res) => {
  const { name, status } = req.body || {}; 
  console.log('req.body', req.body)
  if (!name) {
    return errorResponse(res, "states name is required", 400);
  }

  const [existing] = await runQuery("SELECT * FROM states WHERE name = ?", [name]);
  if (existing.length > 0) { 
    return errorResponse(res, "states Already Exist", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO states (name, status) VALUES (?, ?)`,
      [name, status || null]
    );

    return successResponse(res, "states created successfully", { id: result.insertId, name: name });
  } catch (err) {
    console.error("Error creating states:", err);
    return errorResponse(res, "Error creating states", 500);
  }
};

// Update states by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body || {}; 
  console.log('req.body', req.body)

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid states ID", 400);
  }
  if (!name) {
    return errorResponse(res, "states name is required", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM states WHERE id = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "states not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE states 
       SET name = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [name || existing[0].name, status || existing[0].status, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the states", 400);
    }

    return successResponse(res, "states updated successfully", { id: id, name: name, status:status });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Delete states by ID
export const deleteRecord = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid states ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM states WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "states not found", 404);
    }

    return successResponse(res, "states deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
