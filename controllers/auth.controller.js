import { sendOTPEmail } from "../utils/nodemailer.js";
import { ValidationError } from "../utils/errors.js";
import asyncHandler from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import OTP from "../models/otp.model.js";

const sendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || email.trim() === "") {
        throw new ValidationError("Email is required");
    }
    const result = await sendOTPEmail(email);
    return res.status(200).json(new ApiResponse(200, result));
})

const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || email.trim() === "") {
        throw new ValidationError("Email is required");
    }
    if (!otp || otp.trim() === "") {
        throw new ValidationError("OTP is required");
    }

    const otpRecord = await OTP.findOne({ email, otp }).lean();
    if (!otpRecord) {
        throw new ValidationError("Invalid OTP");
    }
    return res.status(200).json(new ApiResponse(200, { success: true, message: "OTP verified successfully" }));
});


export { sendOTP, verifyOTP }