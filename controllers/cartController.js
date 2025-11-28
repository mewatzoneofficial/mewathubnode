import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";

// ✅ Get all cart records for a specific user
export const getAllRecords = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id || isNaN(user_id)) {
      return errorResponse(res, "Invalid or missing user_id", 400);
    }

    const sqlQuery = `
      SELECT id, user_id, product_id, qty, created_at, updated_at
      FROM carts
      WHERE user_id = ?
      ORDER BY id DESC
    `;

    const [results] = await runQuery(sqlQuery, [user_id]);

    return successResponse(res, "Carts fetched successfully", results);
  } catch (err) {
    console.error("Error fetching carts:", err);
    return errorResponse(res, err.message, 500);
  }
};

// ✅ Create new cart record for a specific user
export const createOrUpdateRecord = async (req, res) => {
  const { user_id } = req.params;
  const { product_id, qty } = req.body;

  if (!user_id || isNaN(user_id)) return errorResponse(res, "Invalid user_id", 400);
  if (!product_id || !qty)
    return errorResponse(res, "product_id and qty are required", 400);

  try {
    // Check if product already in cart
    const [existing] = await runQuery(
      "SELECT id, qty FROM carts WHERE user_id = ? AND product_id = ?",
      [user_id, product_id]
    );

    if (existing.length > 0) {
      // Update qty if exists
      const cart = existing[0];
      const newQty = cart.qty + qty;
      await runQuery(
        "UPDATE carts SET qty = ?, updated_at = NOW() WHERE id = ?",
        [newQty, cart.id]
      );

      return successResponse(res, "Cart updated successfully", { id: cart.id, qty: newQty });
    }

    // Else create new record
    const [result] = await runQuery(
      "INSERT INTO carts (user_id, product_id, qty, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [user_id, product_id, qty]
    );

    return successResponse(res, "Cart created successfully", { id: result.insertId });
  } catch (err) {
    console.error("Error creating cart:", err);
    return errorResponse(res, err.message, 500);
  }
};


// ✅ Delete a single cart record for a specific user
export const deleteRecord = async (req, res) => {
  const { user_id, id } = req.params;

  if (!user_id || isNaN(user_id)) return errorResponse(res, "Invalid user_id", 400);
  if (!id || isNaN(id)) return errorResponse(res, "Invalid cart ID", 400);

  try {
    const [result] = await runQuery("DELETE FROM carts WHERE id = ? AND user_id = ?", [id, user_id]);
    if (result.affectedRows === 0)
      return errorResponse(res, "Cart not found for this user", 404);

    return successResponse(res, "Cart deleted successfully");
  } catch (err) {
    console.error("Error deleting cart:", err);
    return errorResponse(res, err.message, 500);
  }
};

// ✅ Clear all carts for a specific user
export const clearRecord = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id || isNaN(user_id)) return errorResponse(res, "Invalid user_id", 400);

  try {
    const [result] = await runQuery("DELETE FROM carts WHERE user_id = ?", [user_id]);
    return successResponse(
      res,
      result.affectedRows > 0
        ? "All carts cleared successfully for this user"
        : "No carts found for this user"
    );
  } catch (err) {
    console.error("Error clearing carts:", err);
    return errorResponse(res, err.message, 500);
  }
};
