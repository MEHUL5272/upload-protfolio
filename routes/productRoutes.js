const express = require("express");
const router = express.Router();

const Product = require("../models/Product");
const Category = require("../models/Category");

// GET: All products or category-wise products
router.get("/", async (req, res) => {
  try {
    const filter = { isAvailable: true };

    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }

    const products = await Product.find(filter).populate("categoryId");

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoryId");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST: Add a product
router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST: Add default menu products (development setup)
router.post("/seed", async (req, res) => {
  try {
    const menu = [
      { category: "Cold Coffee", name: "Cold Coffee", price: 150 },
      { category: "Cold Coffee", name: "Choco Mix Coffee", price: 200 },
      { category: "Cold Coffee", name: "Bournvita Shake", price: 250 },
      { category: "Cold Coffee", name: "Chocolate Shake", price: 250 },
      { category: "Shake", name: "Oreo Shake", price: 350 },
      { category: "Shake", name: "KitKat Shake", price: 350 },
      { category: "Shake", name: "Cookies & Cream Shake", price: 400 },
      { category: "Ice Tea", name: "Lemon Ice Tea", price: 150 },
      { category: "Ice Tea", name: "Peach Ice Tea", price: 170 }
    ];

    for (const item of menu) {
      const category = await Category.findOne({ name: item.category });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: `Category not found: ${item.category}`
        });
      }

      await Product.updateOne(
        { name: item.name, categoryId: category._id },
        {
          $setOnInsert: {
            name: item.name,
            price: item.price,
            categoryId: category._id,
            size: "350 ml"
          }
        },
        { upsert: true }
      );
    }

    const products = await Product.find().populate("categoryId");

    res.json({
      success: true,
      message: "Menu products added successfully",
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;