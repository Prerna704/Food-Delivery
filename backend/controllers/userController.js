import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

// login user

const loginUser = async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword && normalizedEmail === adminEmail) {
      if (password !== adminPassword) {
        return res.json({ success: false, message: "Invalid Credentials" });
      }
      const token = createToken("admin-env");
      return res.json({ success: true, token, role: "admin" });
    }

    const user = await userModel
      .findOne({ email: normalizedEmail })
      .select("_id password role");
    if (!user) {
      return res.json({ success: false, message: "User Doesn't exist" });
    }
    const isMatch =await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }
    const role=user.role;
    const token = createToken(user._id);
    res.json({ success: true, token,role });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Create token

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET);
};

// register user

const registerUser = async (req, res) => {
  const { name, password } = req.body;
  const email = req.body.email?.trim().toLowerCase();
  try {
    // checking user is already exist
    const exists = await userModel.findOne({ email }).select("_id");
    if (exists) {
      return res.json({ success: false, message: "User already exists" });
    }

    // validating email format and strong password
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter valid email" });
    }
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please enter strong password",
      });
    }

    // hashing user password

    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      name: name,
      email: email,
      password: hashedPassword,
    });

    const user = await newUser.save();
    const role=user.role;
    const token = createToken(user._id);
    res.json({ success: true, token, role});
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

export { loginUser, registerUser };
