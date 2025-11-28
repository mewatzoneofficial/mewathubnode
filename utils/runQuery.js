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
