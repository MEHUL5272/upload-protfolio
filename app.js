require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const connectDB = require("./config/db");
const Cart = require("./models/Cart");

const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const pageRoutes = require("./routes/pageRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Request body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files: CSS, JavaScript, uploaded product images
app.use(express.static(path.join(__dirname, "public")));

// Session setup — routes પહેલાં હોવું જરૂરી
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI
    }),
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Logged-in user અને cart count દરેક EJS page માટે
app.use(async (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.cartCount = 0;

  try {
    if (req.session.userId) {
      const cart = await Cart.findOne({
        userId: req.session.userId
      });

      if (cart) {
        res.locals.cartCount = cart.items.reduce(
          (total, item) => total + item.quantity,
          0
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Profile page
app.get("/profile", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.render("profile");
});

// Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/admin", adminRoutes);
app.use("/", pageRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).send("Something went wrong. Please try again.");
});

// Start server after database connection
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });