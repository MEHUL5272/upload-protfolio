const express = require("express");
const router = express.Router();

const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Check login
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Please login first"
    });
  }

  next();
}

// GET: View user's cart
router.get("/", requireLogin, async (req, res) => {
  try {
    const cart = await Cart.findOne({
      userId: req.session.userId
    }).populate("items.productId");

    res.json({
      success: true,
      cart: cart || { items: [] }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST: Add product to cart
router.post("/add", requireLogin, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const product = await Product.findById(productId);

    if (!product || !product.isAvailable) {
      return res.status(404).json({
        success: false,
        message: "Product not available"
      });
    }

    let cart = await Cart.findOne({
      userId: req.session.userId
    });

    if (!cart) {
      cart = new Cart({
        userId: req.session.userId,
        items: []
      });
    }

    const item = cart.items.find(
      item => item.productId.toString() === productId
    );

    if (item) {
      item.quantity += 1;
    } else {
      cart.items.push({
        productId,
        quantity: 1
      });
    }

    await cart.save();

    const cartCount = cart.items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

    res.json({
      success: true,
      message: "Added to cart",
      cartCount
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// PUT: Update quantity
router.put("/update", requireLogin, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1"
      });
    }

    const cart = await Cart.findOne({
      userId: req.session.userId
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const item = cart.items.find(
      item => item.productId.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart"
      });
    }

    item.quantity = quantity;
    await cart.save();

    const cartCount = cart.items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

    res.json({
      success: true,
      message: "Cart updated",
      cartCount
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE: Remove product from cart
router.delete("/remove/:productId", requireLogin, async (req, res) => {
  try {
    const cart = await Cart.findOne({
      userId: req.session.userId
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.items = cart.items.filter(
      item => item.productId.toString() !== req.params.productId
    );

    await cart.save();

    const cartCount = cart.items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

    res.json({
      success: true,
      message: "Product removed from cart",
      cartCount
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;