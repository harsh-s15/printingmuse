// routes/orders.js
import express from "express";
import Order from "../models/Order.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all orders for logged-in user
router.get("/", isAuthenticated, async (req, res) => {
  const orders = await Order.find({ userId: req.session.userId }).populate("products.productId");
  res.json(orders);
});

// Place a new order
router.post("/", isAuthenticated, async (req, res) => {
  const { products, total } = req.body;
  if (!products || !total) return res.status(400).json({ msg: "Missing order data" });

  const order = new Order({
    userId: req.session.userId,
    products,
    total,
  });

  await order.save();
  res.json({ msg: "Order placed successfully", order });


  // this api should be called after payment is successful
  // razorpay...

  // just here, add functionality to : mail user about order details, and admin about new order 
});

export default router;
