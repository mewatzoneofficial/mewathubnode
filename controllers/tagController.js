import connectDB from "../config/mdb.js";
import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";

// Get all tbl_functions
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
      SELECT * FROM feeds_tag
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;

    const [responseData] = await runQuery(sqlQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) AS total FROM feeds_tag ${whereClause}`;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    return successResponse(res, "feeds tag fetched successfully", {
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


export const getRecords = async (req, res) => {
  try {
      const db = await connectDB();
      // const collection = await db.createCollection("users");
      const result = await db.collection("users").find().toArray();
    // const [result] = await runQuery("SELECT * FROM tbl_functions WHERE id = ?", [id]);
    console.log('result', result)
    if (!result.length) {
      return errorResponse(res, "Category not found", 404);
    }

    return successResponse(res, "Category fetched successfully", result[0]);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Get category by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid category ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM tbl_functions WHERE id = ?", [id]);
    if (!result.length) {
      return errorResponse(res, "Category not found", 404);
    }

    return successResponse(res, "Category fetched successfully", result[0]);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Create a new category
export const createRecord = async (req, res) => {
  const { name, description } = req.body || {}; 
  console.log('req.body', req.body)
  if (!name) {
    return errorResponse(res, "Category name is required", 400);
  }

  const [existing] = await runQuery("SELECT * FROM tbl_functions WHERE name = ?", [name]);
  if (existing.length > 0) { 
    return errorResponse(res, "Category Already Exist", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO tbl_functions (name, description) VALUES (?, ?)`,
      [name, description || null]
    );

    return successResponse(res, "Category created successfully", { id: result.insertId, name: name });
  } catch (err) {
    console.error("Error creating category:", err);
    return errorResponse(res, "Error creating category", 500);
  }
};

// Update category by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body || {}; 
  console.log('req.body', req.body)

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid category ID", 400);
  }
  if (!name) {
    return errorResponse(res, "Category name is required", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM tbl_functions WHERE id = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "Category not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE tbl_functions 
       SET name = ?, description = ?, updated_at = NOW()
       WHERE id = ?`,
      [name || existing[0].name, description || existing[0].description, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the category", 400);
    }

    return successResponse(res, "Category updated successfully", { id: id, name: name, description:description });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Delete category by ID
export const deleteRecord = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid category ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM tbl_functions WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "Category not found", 404);
    }

    return successResponse(res, "Category deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
