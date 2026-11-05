const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");

async function createAdmin() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/shree_shyam_clod_coffee");

    const email = "admin@example.com";
    const password = "123456";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.role = "admin";
      existingUser.password = await bcrypt.hash(password, 10);
      await existingUser.save();

      console.log("Existing user updated as admin.");
    } else {
      await User.create({
        name: "Admin",
        email,
        password: await bcrypt.hash(password, 10),
        role: "admin"
      });

      console.log("Admin account created.");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();