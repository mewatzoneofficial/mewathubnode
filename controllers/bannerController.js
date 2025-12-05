import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";

// Get all products
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      name: trimOrNull(req.query.name),
      price: trimOrNull(req.query.price),
      category_id: req.query.category_id
        ? parseInt(req.query.category_id, 10)
        : null,
    };

    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push("banners.name LIKE ?");
      params.push(`%${filters.name}%`);
    }

    const whereClause = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";

    const sqlQuery = `SELECT * FROM banners ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);
    const records = Array.isArray(results) ? results : [];

     // Corrected COUNT query with JOIN
    const countQuery = `
      SELECT COUNT(*) AS total  FROM banners ${whereClause}`;

    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0])
      ? countResult[0][0]
      : countResult[0];
    const total = countRow?.total || 0;

    const baseImageUrl = process.env.IMAGE_BASE_URL;

    const responseData = records.map((product) => ({
      ...product,
      image: product.image ? `${baseImageUrl}banners/${product.image}` : null,
    }));

    return successResponse(res, "banners fetched successfully", {
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

// Get product by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM banners WHERE id = ?", [
      id,
    ]);

    if (!result.length) {
      return errorResponse(res, "Product not found", 404);
    }

    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const product = result[0];
    const responseData = {
      ...product,
      image: product.image ? `${baseImageUrl}banners/${product.image}` : null,
    };
    return successResponse(res, "Product fetched successfully", responseData);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Create a new product
export const createRecord = async (req, res) => {
  const { category_id, name, description, price, discount_price, qty } =
    req.body;

  const image = req.file ? req.file.filename : null;

  if (!name || !price || !category_id) {
    return errorResponse(res, "Category ID, name, and price are required", 400);
  }

  const [existing] = await runQuery("SELECT * FROM banners WHERE name = ?", [
    name,
  ]);
  if (existing.length > 0) {
    return errorResponse(res, "Product Already Exist", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO banners 
       (category_id, name, description, price, discount_price, qty, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        name,
        description || null,
        price,
        discount_price || 0,
        qty || 0,
        image || null,
      ]
    );

    return successResponse(res, "banners created successfully", {
      id: result.insertId,
      name: name,
      price: price,
    });
  } catch (err) {
    console.error("Error creating banners:", err);
    return errorResponse(res, "Error creating banners", 500);
  }
};

// Update banners by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { category_id, name, description, price, discount_price, qty } =
    req.body || {};
  const image = req.file ? req.file.filename : null;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid banners ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM bannerss WHERE id = ?", [
      id,
    ]);
    if (!existing.length) {
      return errorResponse(res, "banners not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE bannerss SET 
        category_id = ?, 
        name = ?, 
        description = ?, 
        price = ?, 
        discount_price = ?, 
        qty = ?, 
        image = COALESCE(?, image), 
        updated_at = NOW()
      WHERE id = ?`,
      [
        category_id,
        name,
        description || null,
        price,
        discount_price || 0,
        qty || 0,
        image,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the banners", 400);
    }
    return successResponse(res, "banners updated successfully", {
      id: id,
      name: name,
      price: price,
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Delete product by ID
export const deleteRecord = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM banners WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "Product not found", 404);
    }

    return successResponse(res, "Product deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
