import {
  runQuery,
  successResponse,
  errorResponse,
} from "../utils/commonFunctions.js";

// Get all job records
export const getAllRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;
    const trimOrNull = (val) => (val?.trim() ? val.trim() : null);

    const filters = {
      job_title: trimOrNull(req.query.job_title),
      state: trimOrNull(req.query.state),
      city: trimOrNull(req.query.city),
      status: trimOrNull(req.query.status),
    };

    const whereClauses = [];
    const params = [];

    if (filters.job_title) {
      whereClauses.push("job_title LIKE ?");
      params.push(`%${filters.job_title}%`);
    }
    if (filters.state) {
      whereClauses.push("state LIKE ?");
      params.push(`%${filters.state}%`);
    }
    if (filters.city) {
      whereClauses.push("city LIKE ?");
      params.push(`%${filters.city}%`);
    }
    if (filters.status) {
      whereClauses.push("status = ?");
      params.push(filters.status);
    }

    const whereClause = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";

    const sqlQuery = `
      SELECT jobID, job_eny_id, link_id, posted_by, employerID, catID, functionID, job_title, slug, state, city,
             job_type, work_mode, job_level, min_experience, max_experience, experience_unit, medium, qualification,
             job_description, doc_required, job_designation, no_of_requirement, min_salary, max_salary, salary_type,
             salary_unit, selection_process, process_location, process_state, process_city, job_location, language,
             area, featured, shift_start, shift_end, working_days, notice_period, urgency, organization, meta_title,
             meta_description, meta_keywords, og_title, og_description, og_keywords, livedemo, onlinetest, openstatus,
             is_delete, status, is_deleted, priority, approval_status, boost, approval_by, approval_time, job_session,
             job_orderid, views, likes, applauds, job_boost, remarks, work_permit, hide_status, draft_status,
             created_by, updated_at, created_at, redirectionType, redirectionUrl, redirectionEmail, application_destination_type,
             destination_path, destination_url, destination_email, apply_email, apply_phone
      FROM jobs
      ${whereClause}
      ORDER BY jobID DESC
      LIMIT ? OFFSET ?;
    `;

    const [results] = await runQuery(sqlQuery, [...params, limit, offset]);
    const responseData = Array.isArray(results) ? results : [];

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM jobs
      ${whereClause};
    `;
    const countResult = await runQuery(countQuery, params);
    const countRow = Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0];
    const total = countRow?.total || 0;

    return successResponse(res, "Jobs fetched successfully", {
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

// Get job record by ID
export const getRecordById = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid job ID", 400);
  }

  try {
    const [result] = await runQuery(
      "SELECT * FROM jobs WHERE jobID = ?",
      [id]
    );

    if (!result.length) {
      return errorResponse(res, "Job not found", 404);
    }

    return successResponse(res, "Job fetched successfully", result[0]);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Create a new job record
export const createRecord = async (req, res) => {
  const {
    job_title,
    posted_by,
    employerID,
    catID,
    functionID,
    state,
    city,
    status
  } = req.body;

  if (!job_title || !employerID || !posted_by) {
    return errorResponse(res, "Job title, posted_by, and employerID are required", 400);
  }

  try {
    const [result] = await runQuery(
      `INSERT INTO jobs
       (job_title, posted_by, employerID, catID, functionID, state, city, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [job_title, posted_by, employerID, catID || null, functionID || null, state || null, city || null, status || 'open']
    );

    return successResponse(res, "Job created successfully", { jobID: result.insertId, job_title, employerID });
  } catch (err) {
    console.error("Error creating job:", err);
    return errorResponse(res, "Error creating job", 500);
  }
};

// Update job record by ID
export const updateRecord = async (req, res) => {
  const { id } = req.params;
  const {
    job_title,
    catID,
    functionID,
    state,
    city,
    status
  } = req.body;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid job ID", 400);
  }

  try {
    const [existing] = await runQuery("SELECT * FROM jobs WHERE jobID = ?", [id]);
    if (!existing.length) {
      return errorResponse(res, "Job not found", 404);
    }

    const [result] = await runQuery(
      `UPDATE jobs SET
        job_title = ?, catID = ?, functionID = ?, state = ?, city = ?, status = ?, updated_at = NOW()
      WHERE jobID = ?`,
      [job_title, catID, functionID, state, city, status, id]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "No changes made", 400);
    }

    return successResponse(res, "Job updated successfully", { jobID: id });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// Delete job record by ID
export const deleteRecord = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return errorResponse(res, "Invalid job ID", 400);
  }

  try {
    const [result] = await runQuery("DELETE FROM jobs WHERE jobID = ?", [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, "Job not found", 404);
    }

    return successResponse(res, "Job deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};
