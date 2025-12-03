import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";

/* ================================
   GET ALL CITIES (WITH state_id)
================================ */
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;

    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      name: trimOrNull(req.query.name),
      state_id: req.query.state_id || null
    };

    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push("name LIKE ?");
      params.push(`%${filters.name}%`);
    }

    if (filters.state_id) {
      whereClauses.push("state_id = ?");
      params.push(filters.state_id);
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sqlQuery = `
      SELECT * FROM cities
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;

    const [responseData] = await runQuery(sqlQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) AS total FROM cities ${whereClause}`;
    const countResult = await runQuery(countQuery, params);
    const total = countResult[0][0].total || 0;

    return successResponse(res, "Cities fetched successfully", {
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

/* ================================
   GET CITY BY ID
================================ */
export const getRecordById = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid city ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM cities WHERE id = ?", [id]);
    if (!result.length) {
      return errorResponse(res, "City not found", 404);
    }

    return successResponse(res, "City fetched successfully", result[0]);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

/* ================================
   CREATE NEW CITY (REQUIRES state_id)
================================ */
export const createRecord = async (req, res) => {
  const { name, state_id, status } = req.body || {};

  if (!name) return errorResponse(res, "City name is required", 400);
  if (!state_id) return errorResponse(res, "state_id is required", 400);

  const [existing] = await runQuery(
    "SELECT * FROM cities WHERE name = ? AND state_id = ?",
    [name, state_id]
  );

  if (existing.length > 0) {
    return errorResponse(res, "City already exists in this state", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO cities (name, state_id, status) VALUES (?, ?, ?)`,
      [name, state_id, status || null]
    );

    return successResponse(res, "City created successfully", {
      id: result.insertId,
      name,
      state_id,
    });
  } catch (err) {
    console.error("Error creating city:", err);
    return errorResponse(res, "Error creating city", 500);
  }
};

/* ================================
   UPDATE CITY (REQUIRES state_id)
================================ */
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { name, state_id, status } = req.body || {};

  if (!id || isNaN(id)) return errorResponse(res, "Invalid city ID", 400);
  if (!name) return errorResponse(res, "City name is required", 400);
  if (!state_id) return errorResponse(res, "state_id is required", 400);

  try {
    const [existing] = await runQuery("SELECT * FROM cities WHERE id = ?", [id]);
    if (!existing.length) return errorResponse(res, "City not found", 404);

    // Check duplicate inside same state
    const [duplicate] = await runQuery(
      "SELECT * FROM cities WHERE name = ? AND state_id = ? AND id != ?",
      [name, state_id, id]
    );

    if (duplicate.length > 0) {
      return errorResponse(res, "City already exists in this state", 409);
    }

    const [result] = await runQuery(
      `UPDATE cities 
       SET name = ?, state_id = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, state_id, status || existing[0].status, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the city", 400);
    }

    return successResponse(res, "City updated successfully", {
      id,
      name,
      state_id,
      status,
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

/* ================================
   DELETE CITY
================================ */
export const deleteRecord = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid city ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM cities WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "City not found", 404);
    }

    return successResponse(res, "City deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
