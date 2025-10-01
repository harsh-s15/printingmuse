import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendOTP } from "../utils/mailer.js";
import { otpStore } from "../utils/otpStore.js";
import Otp from "../models/otp.js";

const router = express.Router();


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

        // await sendOTP(email, otp);

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


export default router;
