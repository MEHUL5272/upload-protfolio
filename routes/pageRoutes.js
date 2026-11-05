const express = require("express");
const router = express.Router();

const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");

// Home Page
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    const products = await Product.find({ isAvailable: true })
      .populate("categoryId");

    res.render("home", { categories, products });
  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).send("Could not load home page.");
  }
});

// All Products / Menu Page
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find({ isAvailable: true })
      .populate("categoryId");

    res.render("product-details", { products });
  } catch (error) {
    console.error("Products page error:", error);
    res.status(500).send("Could not load products.");
  }
});

// Single Product Details Page
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoryId");

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("product-single", { product });
  } catch (error) {
    console.error("Product details error:", error);
    res.status(400).send("Invalid product ID");
  }
});

// Register Page
router.get("/register", (req, res) => {
  res.render("register");
});

// Login Page
router.get("/login", (req, res) => {
  res.render("login");
});

// Cart Page
router.get("/cart", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  res.render("cart");
});

// Checkout Page
router.get("/checkout", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  res.render("checkout");
});

// My Orders Page
router.get("/my-orders", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const orders = await Order.find({
      userId: req.session.userId
    }).sort({ createdAt: -1 });

    res.render("my-orders", { orders });
  } catch (error) {
    console.error("My orders error:", error);
    res.status(500).send("Could not load your orders.");
  }
});

module.exports = router;