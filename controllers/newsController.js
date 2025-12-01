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
      whereClauses.push("products.name LIKE ?");
      params.push(`%${filters.name}%`);
    }

    if (filters.price) {
      whereClauses.push("products.price LIKE ?");
      params.push(`%${filters.price}%`);
    }

    if (filters.category_id) {
      whereClauses.push("products.category_id = ?");
      params.push(filters.category_id);
    }


    const whereClause = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";

    const sqlQuery = `
      SELECT products.id, products.category_id, products.name, products.description, products.price, products.discount_price,
             products.qty, products.image, products.created_at, categories.name as cat_name 
        FROM products
        JOIN categories ON products.category_id = categories.id
        ${whereClause}
        ORDER BY id DESC
        LIMIT ? OFFSET ?;
    `;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);

    // Ensure results is never null, default to empty array
    const products = Array.isArray(results) ? results : [];

     // Corrected COUNT query with JOIN
    const countQuery = `
      SELECT COUNT(*) AS total 
        FROM products
        LEFT JOIN categories ON products.category_id = categories.id
        ${whereClause}
    `;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0])
      ? countResult[0][0]
      : countResult[0];
    const total = countRow?.total || 0;

    const baseImageUrl = process.env.IMAGE_BASE_URL;

    const responseData = products.map((product) => ({
      ...product,
      image: product.image ? `${baseImageUrl}products/${product.image}` : null,
    }));

    return successResponse(res, "Products fetched successfully", {
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
    const [result] = await runQuery("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

    if (!result.length) {
      return errorResponse(res, "Product not found", 404);
    }

    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const product = result[0];
    const responseData = {
      ...product,
      image: product.image ? `${baseImageUrl}products/${product.image}` : null,
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

  const [existing] = await runQuery("SELECT * FROM products WHERE name = ?", [
    name,
  ]);
  if (existing.length > 0) {
    return errorResponse(res, "Product Already Exist", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO products 
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

    return successResponse(res, "Product created successfully", {
      id: result.insertId,
      name: name,
      price: price,
    });
  } catch (err) {
    console.error("Error creating product:", err);
    return errorResponse(res, "Error creating product", 500);
  }
};

// Update product by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const { category_id, name, description, price, discount_price, qty } =
    req.body || {};
  const image = req.file ? req.file.filename : null;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if (!existing.length) {
      return errorResponse(res, "Product not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE products SET 
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
      return errorResponse(res, "No changes made to the product", 400);
    }
    return successResponse(res, "Product updated successfully", {
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
    const [result] = await runQuery("DELETE FROM products WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "Product not found", 404);
    }

    return successResponse(res, "Product deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
