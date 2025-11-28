import { runQuery, successResponse, errorResponse } from "../utils/commonFunctions.js";

// ✅ Get all orders
export const getAllRecords = async (req, res) => {
  try {
    const sql = `
      SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_method, 
             o.payment_status, o.address, o.created_at, o.updated_at,
             COUNT(oi.id) AS total_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.id DESC
    `;

    const [orders] = await runQuery(sql);
    return successResponse(res, "Orders fetched successfully", orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    return errorResponse(res, err.message, 500);
  }
};

// ✅ Get a single order by ID (with items)
export const getRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) return errorResponse(res, "Invalid order ID", 400);

    const [orderData] = await runQuery(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    if (orderData.length === 0)
      return errorResponse(res, "Order not found", 404);

    const [items] = await runQuery(
      `SELECT oi.id, oi.product_id, p.name, oi.qty, oi.price, oi.total 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [id]
    );

    const order = { ...orderData[0], items };
    return successResponse(res, "Order fetched successfully", order);
  } catch (err) {
    console.error("Error fetching order:", err);
    return errorResponse(res, err.message, 500);
  }
};

// ✅ Create new order (from cart)
export const createRecord = async (req, res) => {
  try {
    const { user_id, payment_method, address } = req.body;
    console.log("req.body", req.body)

    if (!user_id || isNaN(user_id))
      return errorResponse(res, "Invalid or missing user_id", 400);

    // 1️⃣ Get user's cart items
    const [cartItems] = await runQuery(
      `SELECT c.product_id, c.qty, p.price FROM carts c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [user_id]
    );
    console.log("cartItems", cartItems)

    if (cartItems.length === 0)
      return errorResponse(res, "Cart is empty", 400);

    // 2️⃣ Calculate total
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );

    // 3️⃣ Create order
    const [orderResult] = await runQuery(
      `INSERT INTO orders (user_id, total_amount, payment_method, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [user_id, totalAmount, payment_method || "cod", address || ""]
    );
    const order_id = orderResult.insertId;

    // 4️⃣ Insert order items
    const values = cartItems.map(item => [
      order_id,
      item.product_id,
      item.qty,
      item.price,
    ]);
    await runQuery(
      "INSERT INTO order_items (order_id, product_id, qty, price, created_at) VALUES ?",
      [values]
    );

    // 5️⃣ Clear user’s cart
    await runQuery("DELETE FROM carts WHERE user_id = ?", [user_id]);

    return successResponse(res, "Order placed successfully", {
      order_id,
      total_amount: totalAmount,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return errorResponse(res, err.message, 500);
  }
};

// ✅ Delete an order
export const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id))
      return errorResponse(res, "Invalid order ID", 400);

    // Delete order and related items (due to foreign key cascade)
    const [result] = await runQuery("DELETE FROM orders WHERE id = ?", [id]);

    if (result.affectedRows === 0)
      return errorResponse(res, "Order not found", 404);

    return successResponse(res, "Order deleted successfully");
  } catch (err) {
    console.error("Error deleting order:", err);
    return errorResponse(res, err.message, 500);
  }
};
