import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";

// Get all blogs
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      title: trimOrNull(req.query.title),
      category: trimOrNull(req.query.category),
      author: trimOrNull(req.query.author),
    };

    const whereClauses = [];
    const params = [];

    if (filters.title) {
      whereClauses.push("blog.title LIKE ?");
      params.push(`%${filters.title}%`);
    }

    if (filters.category) {
      whereClauses.push("blog.category LIKE ?");
      params.push(`%${filters.category}%`);
    }

    if (filters.author) {
      whereClauses.push("blog.author LIKE ?");
      params.push(`%${filters.author}%`);
    }

    const whereClause = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";

    const sqlQuery = `
      SELECT * FROM newsblog
      ${whereClause}
      ORDER BY blogid DESC
      LIMIT ? OFFSET ?;
    `;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);

    const blogs = Array.isArray(results) ? results : [];

    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM newsblog
      ${whereClause}
    `;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0])
      ? countResult[0][0]
      : countResult[0];
    const total = countRow?.total || 0;

    const baseImageUrl = process.env.IMAGE_BASE_URL;

    const responseData = blogs.map((blog) => ({
      ...blog,
      blogimage: blog.blogimage ? `${baseImageUrl}blog/${blog.blogimage}` : null,
      image_thumb: blog.image_thumb
        ? `${baseImageUrl}blog/thumb/${blog.image_thumb}`
        : null,
    }));

    return successResponse(res, "newsblog fetched successfully", {
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

// Get newsblog by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid newsblog ID", 400);
  }

  try {
    const [result] = await runQuery("SELECT * FROM newsblog WHERE blogid = ?", [
      id,
    ]);

    if (!result.length) {
      return errorResponse(res, "newsblog not found", 404);
    }

    const baseImageUrl = process.env.IMAGE_BASE_URL;
    const blog = result[0];
    const responseData = {
      ...blog,
      blogimage: blog.blogimage
        ? `${baseImageUrl}blog/${blog.blogimage}`
        : null,
      image_thumb: blog.image_thumb
        ? `${baseImageUrl}blog/thumb/${blog.image_thumb}`
        : null,
    };

    return successResponse(res, "newsblog fetched successfully", responseData);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Create a new blog
export const createRecord = async (req, res) => {
  const {
    featured,
    category,
    title,
    slug,
    short_description,
    long_description,
    author,
    likes,
    meta_title,
    meta_description,
    meta_keywords,
    og_title,
    og_description,
    og_keywords,
  } = req.body;

  const blogimage = req.file ? req.file.filename : null;

  if (!title || !slug) {
    return errorResponse(res, "Title and slug are required", 400);
  }

  const [existing] = await runQuery("SELECT * FROM newsblog WHERE slug = ?", [
    slug,
  ]);
  if (existing.length > 0) {
    return errorResponse(res, "Slug already exists", 409);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO newsblog 
       (featured, category, title, slug, blogimage, short_description, long_description, author, likes, 
        meta_title, meta_description, meta_keywords, og_title, og_description, og_keywords)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        featured || 0,
        category || null,
        title,
        slug,
        blogimage || null,
        short_description || null,
        long_description || null,
        author || null,
        likes || 0,
        meta_title || null,
        meta_description || null,
        meta_keywords || null,
        og_title || null,
        og_description || null,
        og_keywords || null,
      ]
    );

    return successResponse(res, "Blog created successfully", {
      id: result.insertId,
      title,
      slug,
    });
  } catch (err) {
    console.error("Error creating blog:", err);
    return errorResponse(res, "Error creating blog", 500);
  }
};

// Update blog
export const updateRecord = async (req, res) => {
  const { id } = req.params;

  const {
    featured,
    category,
    title,
    slug,
    short_description,
    long_description,
    author,
    likes,
    meta_title,
    meta_description,
    meta_keywords,
    og_title,
    og_description,
    og_keywords,
  } = req.body;

  const blogimage = req.file ? req.file.filename : null;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid newsblog ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM newsblog WHERE blogid = ?", [
      id,
    ]);
    if (!existing.length) {
      return errorResponse(res, "Blog not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE blog SET 
        featured = ?, 
        category = ?, 
        title = ?, 
        slug = ?, 
        short_description = ?, 
        long_description = ?, 
        author = ?, 
        likes = ?, 
        meta_title = ?, 
        meta_description = ?, 
        meta_keywords = ?, 
        og_title = ?, 
        og_description = ?, 
        og_keywords = ?, 
        blogimage = COALESCE(?, blogimage), 
        updated_at = NOW()
      WHERE blogid = ?`,
      [
        featured || 0,
        category || null,
        title,
        slug,
        short_description || null,
        long_description || null,
        author || null,
        likes || 0,
        meta_title || null,
        meta_description || null,
        meta_keywords || null,
        og_title || null,
        og_description || null,
        og_keywords || null,
        blogimage,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made to the blog", 400);
    }

    return successResponse(res, "Blog updated successfully", {
      id,
      title,
      slug,
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Delete blog
export const deleteRecord = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid newsblog ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM newsblog WHERE blogid = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "newsblog not found", 404);
    }

    return successResponse(res, "newsblog deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
