import connectDB from "../config/mdb.js";
import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";

// Get all categories
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
      SELECT id, name, description, created_at, updated_at
      FROM categories
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) AS total FROM categories ${whereClause}`;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    return successResponse(res, "Categories fetched successfully", {
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


export const getRecords = async (req, res) => {
  try {
      const db = await connectDB();
      // const collection = await db.createCollection("users");
      const result = await db.collection("users").find().toArray();
    // const [result] = await runQuery("SELECT * FROM categories WHERE id = ?", [id]);
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
    const [result] = await runQuery("SELECT * FROM categories WHERE id = ?", [id]);
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

  const [existing] = await runQuery("SELECT * FROM categories WHERE name = ?", [name]);
  if (existing.length > 0) { 
    return errorResponse(res, "Category Already Exist", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO categories (name, description) VALUES (?, ?)`,
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
    const [existing] = await runQuery("SELECT * FROM categories WHERE id = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "Category not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE categories 
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
    const [result] = await runQuery("DELETE FROM categories WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "Category not found", 404);
    }

    return successResponse(res, "Category deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// Get admin profile by ID
export const authProfile = async (req, res) => {
  const adminID = req.params.id;
  try {
    const results = await runQuery("SELECT * FROM admin WHERE adminID = ?", [
      adminID,
    ]);

    if (!results.length) return sendError(res, "User not found", 404);

    return sendSuccess(res, results[0]);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// Update admin profile by ID (with optional image)
export const updateProfile = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    mobile,
    email,
    official_email,
    official_mobile,
    dob,
    joining_date,
    gender,
  } = req.body;

  const imageFile = req.file; // multer upload

  if (!name || !email || !mobile) {
    return sendError(res, "Name, email, and mobile are required", 400);
  }

  try {
    // Check if admin exists
    const [existing] = await runQuery("SELECT * FROM admin WHERE adminID = ?", [
      id,
    ]);
    if (!existing) return sendError(res, "Admin not found", 404);

    // Check for email/mobile conflict (with other users)
    const conflict = await runQuery(
      "SELECT adminID FROM admin WHERE (email = ? OR mobile = ?) AND adminID != ?",
      [email, mobile, id]
    );
    if (conflict.length) {
      return sendError(
        res,
        "Email or mobile already exists for another admin",
        400
      );
    }

    // Handle image upload
    let imagePath = existing.image;
    if (imageFile) {
      imagePath = `/uploads/${imageFile.filename}`;

      // Delete old image if exists
      if (
        existing.image &&
        fs.existsSync(path.join("public", existing.image))
      ) {
        fs.unlinkSync(path.join("public", existing.image));
      }
    }

    // Update record
    const result = await runQuery(
      `UPDATE admin
       SET name = ?, email = ?, mobile = ?, official_email = ?, official_mobile = ?,
        dob = ?, joining_date = ?, gender = ?, image = ?
       WHERE adminID = ?`,
      [
        name,
        email,
        mobile,
        official_email || null,
        official_mobile || null,
        dob || null,
        joining_date || null,
        gender || null,
        imagePath,
        id,
      ]
    );

    if (!result.affectedRows) return sendError(res, "Update failed", 400);

    return sendSuccess(res, {
      id,
      name,
      email,
      mobile,
      official_email,
      official_mobile,
      dob,
      joining_date,
      gender,
      image: imagePath,
    });
  } catch (err) {
    console.error("Error updating admin:", err);
    return sendError(res, "Server error: " + err.message, 500);
  }
};

// User chart data
export const userChart = async (req, res) => {
  try {
    const results = await runQuery(`
      SELECT 
        (SELECT COUNT(*) FROM faculity_users) AS total_faculity_users,
        (SELECT COUNT(*) FROM faculity_users WHERE DATE(created_at) = CURRENT_DATE) AS total_today_faculty_users,
        (SELECT COUNT(*) FROM faculity_users  WHERE experience = '0' OR salary = '0' OR university = '' OR job_function = '0') AS total_incomplete_faculty_users,
        (SELECT COUNT(*) FROM block_request  JOIN faculity_users ON faculity_users.faculityID = block_request.user_id) AS total_blocked_faculty_users
    `);

    if (!results.length) return sendError(res, "No data found", 404);

    return sendSuccess(res, results[0]);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// Job chart data
export const jobChart = async (req, res) => {
  try {
    const results = await runQuery(`
      SELECT 
        (SELECT COUNT(*) FROM jobs) AS total_jobs,
        (SELECT COUNT(*) FROM applied_jobs) AS total_applied_jobs,
        (SELECT COUNT(*) FROM jobs WHERE draft_status = 'yes') AS total_drafted_jobs,
        (SELECT COUNT(*) FROM applied_jobs aj  JOIN jobs j ON aj.jobID = j.jobID 
         WHERE aj.status = 'Rejected') AS total_rejected_jobs,
        (SELECT COUNT(*) FROM jobs WHERE approval_status = 1) AS total_approval_jobs
    `);

    if (!results.length) return sendError(res, "No data found", 404);

    return sendSuccess(res, results[0]);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

// Employer job chart with filter
export const employerJobChart = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = "";

    switch (filter) {
      case "day":
        query = `
          SELECT DATE_FORMAT(e.created_at, '%e %b') AS time,
                 COUNT(DISTINCT e.employerID) AS employers,
                 COUNT(DISTINCT j.jobID) AS jobs
          FROM employer_user e
          LEFT JOIN jobs j ON e.employerID = j.employerID
          WHERE e.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            AND e.created_at <= CURDATE()
          GROUP BY DATE(e.created_at)
          ORDER BY DATE(e.created_at)
        `;
        break;
      case "week":
        query = `
          SELECT DATE_FORMAT(e.created_at, '%a %e %b') AS time,
                 COUNT(DISTINCT e.employerID) AS employers,
                 COUNT(DISTINCT j.jobID) AS jobs
          FROM employer_user e
          LEFT JOIN jobs j ON e.employerID = j.employerID
          WHERE e.created_at >= DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE())) DAY)
            AND e.created_at < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE())) DAY), INTERVAL 7 DAY)
          GROUP BY DATE(e.created_at)
          ORDER BY DATE(e.created_at)
        `;
        break;
      case "month":
        query = `
          SELECT DATE_FORMAT(e.created_at, '%b %Y') AS time,
                 COUNT(DISTINCT e.employerID) AS employers,
                 COUNT(DISTINCT j.jobID) AS jobs
          FROM employer_user e
          LEFT JOIN jobs j ON e.employerID = j.employerID
          WHERE YEAR(e.created_at) = YEAR(CURDATE())
          GROUP BY YEAR(e.created_at), MONTH(e.created_at)
          ORDER BY YEAR(e.created_at), MONTH(e.created_at)
        `;
        break;
      case "year":
        query = `
          SELECT YEAR(e.created_at) AS time,
                 COUNT(DISTINCT e.employerID) AS employers,
                 COUNT(DISTINCT j.jobID) AS jobs
          FROM employer_user e
          LEFT JOIN jobs j ON e.employerID = j.employerID
          WHERE YEAR(e.created_at) >= YEAR(CURDATE()) - 9
          GROUP BY YEAR(e.created_at)
          ORDER BY YEAR(e.created_at)
        `;
        break;
      default:
        return sendError(res, "Invalid filter", 400);
    }

    const results = await runQuery(query);

    if (!results.length) return sendError(res, "No data found", 404);

    return sendSuccess(res, results);
  } catch (err) {
    console.error(err);
    return sendError(res, err.message, 500);
  }
};