import express from "express";
import { verifyOTP,sendOTP,loginWithGoogle,gitHubLogin,gitHubCallback } from "../controllers/auth.controller.js";
const router = express.Router();

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/google",loginWithGoogle)
router.get("/github", gitHubLogin);
router.get("/github/callback", gitHubCallback);


export default router;