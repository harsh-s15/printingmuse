// models/Product.js

import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: String,
  price: Number,
  image: String,                        
});

export default mongoose.model("Product", productSchema);
