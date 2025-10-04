import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendOTP } from "../utils/mailer.js";
import { otpStore } from "../utils/otpStore.js";
import Otp from "../models/otp.js";

const router = express.Router();




// Step 1: Request OTP to get email verified

router.post("/send-otp", async (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: "Email required" });


        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ msg: "User already exists" });


        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min


        // upsert OTP (overwrite if exists)
        await Otp.findOneAndUpdate(
                { email },
                { otp, expiresAt },
                { upsert: true, new: true }
        );

        // await sendOTP(email, otp);   // Uncomment this line to actually send email   

        res.json({ msg: "OTP sent to email" });
});








// Step 2: Verify OTP

router.post("/verify-otp", async (req, res) => {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ msg: "All fields required" });

        const record = await Otp.findOne({ email });
        if (!record) return res.status(400).json({ msg: "OTP not yet requested" });

        if (record.expiresAt < new Date()) return res.status(400).json({ msg: "OTP expired" });

        if (record.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });

        // ✅ Mark as verified
        record.verified = true;
        await record.save();

        res.json({ msg: "OTP verified, you can now set password" });
});




// Step 3: Register user (set password) - only if email is verified. User will have to first verify email and then be allowed to set password.

router.post("/register", async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password)
                return res.status(400).json({ msg: "All fields required" });


        const record = await Otp.findOne({ email });
        if (!record || !record.verified) return res.status(400).json({ msg: "Email not verified" });

        if (record.expiresAt < new Date()) return res.status(400).json({ msg: "OTP expired" });

        const hashed = await bcrypt.hash(password, 10);

        // save user
        const user = new User({ email, password: hashed });
        await user.save();

        // cleanup OTP entry
        await Otp.deleteOne({ email });

        res.json({ msg: "User registered successfully" });
});





// login route

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ msg: "Missing fields" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ msg: "Invalid credentials" });

  req.session.userId = user._id;
  res.json({ msg: "Login successful", userId: user._id });
});





// logout route

router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ msg: "Logout failed" });
    res.clearCookie("connect.sid"); // default cookie name
    res.json({ msg: "Logged out successfully" });
  });
});






/**
Check Session
 */
router.get("/me", (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ loggedIn: true, userId: req.session.userId });
  }
  res.json({ loggedIn: false });
});



export default router;






