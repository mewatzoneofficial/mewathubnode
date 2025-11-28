import pool from "../config/db.js";

export const runQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return [rows, null];
  } catch (error) {
    console.error("❌ SQL Error:", error.message);
    return [null, error];
  }
};

export const successResponse = (res, message = "Success", data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, message = "Something went wrong", statusCode = 400, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors ? errors.toString() : undefined,
  });
};
