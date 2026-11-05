const express = require("express");
const router = express.Router();

const User = require("../models/user");
const Order = require("../models/order");
const Product = require("../models/product");
const Category = require("../models/category");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../public/uploads/products");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  }
});

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect("/admin/login");
  }

  if (req.session.userRole !== "admin") {
    return res.status(403).send("Access denied. Admin only.");
  }

  next();
}

// Login page
router.get("/login", (req, res) => {
  if (req.session.userRole === "admin") {
    return res.redirect("/admin/dashboard");
  }

  res.render("admin/login", { error: null });
});

// Login submit
router.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    const user = await User.findOne({ email });

    if (!user || user.role !== "admin") {
      return res.status(401).render("admin/login", {
        error: "Invalid admin email or password."
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).render("admin/login", {
        error: "Invalid admin email or password."
      });
    }

    req.session.userId = user._id.toString();
    req.session.userRole = user.role;
    req.session.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    req.session.save((error) => {
      if (error) return res.status(500).send("Session save failed.");
      res.redirect("/admin/dashboard");
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).render("admin/login", {
      error: "Login failed. Please try again."
    });
  }
});

// Dashboard
router.get(["/", "/dashboard"], requireAdmin, async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "Pending" });

    res.render("admin/dashboard", {
      totalOrders,
      pendingOrders
    });
  } catch (error) {
    next(error);
  }
});

// Orders list
router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.render("admin/orders", { orders });
  } catch (error) {
    console.error("Admin orders error:", error);
    res.status(500).send("Could not load orders.");
  }
});

// Update order status
router.post("/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Preparing",
      "Delivered",
      "Cancelled"
    ];

    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).send("Invalid order status.");
    }

    await Order.findByIdAndUpdate(req.params.id, {
      status: req.body.status
    });

    res.redirect("/admin/orders");
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).send("Could not update order status.");
  }
});

// Products list
router.get("/products", requireAdmin, async (req, res) => {
  try {
    const products = await Product.find()
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    res.render("admin/products/index", { products });
  } catch (error) {
    console.error("Products load error:", error);
    res.status(500).send("Products load karvama error.");
  }
});

// Add product form
router.get("/products/add", requireAdmin, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    res.render("admin/products/form", {
      product: null,
      categories,
      error: null
    });
  } catch (error) {
    console.error("Categories load error:", error);
    res.status(500).send("Categories load karvama error.");
  }
});

// Create product
router.post(
  "/products/add",
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description, price, size, categoryId } = req.body;

      const category = await Category.findOne({
        _id: categoryId,
        isActive: true
      });

      if (!category) {
        const categories = await Category.find({ isActive: true }).sort({ name: 1 });

        return res.status(400).render("admin/products/form", {
          product: null,
          categories,
          error: "Valid active category select karo."
        });
      }

      await Product.create({
        name: (name || "").trim(),
        description,
        price: Number(price),
        size,
        image: req.file ? `/uploads/products/${req.file.filename}` : "",
        categoryId
      });

      res.redirect("/admin/products");
    } catch (error) {
      console.error("Product add error:", error);
      res.status(400).send("Product add na thayu. Details check karo.");
    }
  }
);

// Edit product form
router.get("/products/:id/edit", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found.");

    const categories = await Category.find({
      $or: [{ isActive: true }, { _id: product.categoryId }]
    }).sort({ name: 1 });

    res.render("admin/products/form", {
      product,
      categories,
      error: null
    });
  } catch (error) {
    console.error("Product edit page error:", error);
    res.status(400).send("Invalid product ID.");
  }
});

// Update product
router.post(
  "/products/:id/edit",
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description, price, size, categoryId } = req.body;

      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).send("Product not found.");

      const category = await Category.findById(categoryId);
      if (!category) return res.status(400).send("Valid category select karo.");

      product.name = (name || "").trim();
      product.description = description;
      product.price = Number(price);
      product.size = size;
      product.categoryId = categoryId;

      if (req.file) {
        product.image = `/uploads/products/${req.file.filename}`;
      }

      await product.save();
      res.redirect("/admin/products");
    } catch (error) {
      console.error("Product update error:", error);
      res.status(400).send("Product update na thayu.");
    }
  }
);

// Delete product
router.post("/products/:id/delete", requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Product delete error:", error);
    res.status(400).send("Product delete na thayu.");
  }
});

// Logout
router.get("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("connect.sid");
    res.redirect("/admin/login");
  });
});

module.exports = router;