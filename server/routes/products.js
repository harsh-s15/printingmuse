// routes/products.js
import express from "express";
import Product from "../models/Product.js";

const router = express.Router();



// Public: get all products
router.get("/", async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

export default router;
