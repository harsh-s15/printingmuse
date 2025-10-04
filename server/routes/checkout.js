import express from "express";
import crypto from "crypto";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import { isAuth } from "../middleware/auth.js";
import razorpay from "../config/razorpay.js";

const router = express.Router();

// Step 1: Create Razorpay Order
router.post("/create-order", isAuth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.session.userId }).populate("items.productId");
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ msg: "Cart is empty" });
  }

  const total = cart.items.reduce((sum, i) => sum + i.productId.price * i.quantity, 0);

  const options = {
    amount: total * 100, // in paise
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
  };

  try {
    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID, // send this to frontend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creating Razorpay order" });
  }
});

// Step 2: Verify Payment + Create Order in MongoDB
router.post("/verify", isAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    const cart = await Cart.findOne({ user: req.session.userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ msg: "Cart empty" });
    }

    const total = cart.items.reduce((sum, i) => sum + i.productId.price * i.quantity, 0);

    const order = new Order({
      user: req.session.userId,
      items: cart.items,
      totalAmount: total,
      status: "paid",
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
    });
    await order.save();

    // clear cart
    await Cart.findOneAndUpdate({ user: req.session.userId }, { items: [] });

    res.json({ msg: "Payment verified & order created", orderId: order._id });
  } else {
    res.status(400).json({ msg: "Invalid signature. Payment not verified." });
  }
});

export default router;
