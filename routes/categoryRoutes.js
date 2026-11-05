const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

// GET: All categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST: Add category
router.post("/", async (req, res) => {
  try {
    const { name, description, image } = req.body;

    const category = await Category.create({
      name,
      description,
      image
    });

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST: Add default coffee categories
router.post("/seed", async (req, res) => {
  try {
    const names = ["Cold Coffee", "Shake", "Ice Tea"];

    for (const name of names) {
      await Category.updateOne(
        { name },
        { $setOnInsert: { name } },
        { upsert: true }
      );
    }

    const categories = await Category.find();

    res.json({
      success: true,
      message: "Categories added successfully",
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;