const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Please login first."
    });
  }

  next();
}

// GET: Logged-in user's orders
router.get("/my-orders", requireLogin, async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.session.userId
    }).sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Load orders error:", error);
    res.status(500).json({
      success: false,
      message: "Could not load orders."
    });
  }
});

// POST: Place a new order from cart
router.post("/", requireLogin, async (req, res) => {
  try {
    const { customerName, phone, address } = req.body;

    if (
      typeof customerName !== "string" || !customerName.trim() ||
      typeof phone !== "string" || !phone.trim() ||
      typeof address !== "string" || !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all checkout fields."
      });
    }

    const cart = await Cart.findOne({ userId: req.session.userId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty."
      });
    }

    const orderItems = [];

    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.productId);

      if (!product || !product.isAvailable) {
        return res.status(400).json({
          success: false,
          message: "A product in your cart is no longer available."
        });
      }

      const price = Number(product.price);
      const quantity = Number(cartItem.quantity);

      if (
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product or quantity in cart."
        });
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity
      });
    }

    const total = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      userId: req.session.userId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: orderItems,
      total
    });

    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      orderId: order._id
    });
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({
      success: false,
      message: "Could not place order. Please try again."
    });
  }
});

// PUT: Edit a user's own Pending order
// Accepts customerName, phone, address, and optionally items: [{ productId, quantity }]
router.put("/:orderId", requireLogin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID."
      });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.session.userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    if (order.status !== "Pending") {
      return res.status(403).json({
        success: false,
        message: "Only Pending orders can be edited."
      });
    }

    const { customerName, phone, address, items } = req.body;

    if (
      typeof customerName !== "string" || !customerName.trim() ||
      typeof phone !== "string" || !phone.trim() ||
      typeof address !== "string" || !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all checkout fields."
      });
    }

    order.customerName = customerName.trim();
    order.phone = phone.trim();
    order.address = address.trim();

    // If items are sent, replace the order's items and recalculate total.
    // If items are omitted, only customer details are updated.
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "An order must contain at least one item."
        });
      }

      const updatedItems = [];

      for (const item of items) {
        if (
          !item ||
          !mongoose.isValidObjectId(item.productId) ||
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid product or quantity."
          });
        }

        const product = await Product.findById(item.productId);

        if (!product || !product.isAvailable) {
          return res.status(400).json({
            success: false,
            message: "A product is no longer available."
          });
        }

        updatedItems.push({
          productId: product._id,
          name: product.name,
          price: Number(product.price),
          quantity: Number(item.quantity)
        });
      }

      order.items = updatedItems;
      order.total = updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
    }

    await order.save();

    res.json({
      success: true,
      message: "Order updated successfully.",
      order
    });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update order."
    });
  }
});

// DELETE: Cancel a user's own Pending order
router.delete("/:orderId", requireLogin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID."
      });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.session.userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    if (order.status !== "Pending") {
      return res.status(403).json({
        success: false,
        message: "Only Pending orders can be cancelled."
      });
    }

    order.status = "Cancelled";
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully."
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Could not cancel order."
    });
  }
});

module.exports = router;