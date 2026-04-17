import { sendOTPEmail } from "../utils/nodemailer.js";
import { ValidationError } from "../utils/errors.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import OTP from "../models/otp.model.js";
import { verifyToken } from "../utils/googleAuth.js";
import User from "../models/user.model.js";
import Directory from "../models/directory.model.js";
import Session from "../models/session.model.js";
import mongoose from "mongoose";

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

    const otpRecord = await OTP.exists({ email, otp });
    if (!otpRecord) {
        throw new ValidationError("Invalid OTP");
    }
    return res.status(200).json(new ApiResponse(200, { success: true, message: "OTP verified successfully" }));
});


const loginWithGoogle = asyncHandler(async (req, res) => {
    const { idToken } = req.body
    if (!idToken || idToken.trim() === "") {
        throw new ValidationError("ID Token is required");
    }
    const { email, name, picture } = await verifyToken(idToken);

    let user = await User.findOne({ email });
    let session;
    if (user) {
        session = await Session.create({ userId: user._id })
    } else {
        const mongooseSession = await mongoose.startSession();
        mongooseSession.startTransaction();
        try {
            const userId = new mongoose.Types.ObjectId();
            const rootDirId = new mongoose.Types.ObjectId();
            console.log(userId, rootDirId);
            user = new User({
                _id: userId,
                email,
                name,
                picture,
                rootDirId,
                loginProvider: "google"
            })
            await user.save({ session: mongooseSession });
            const dir = new Directory({
                _id: rootDirId,
                parentDirId: null,
                name: `root-${email}`,
                userId
            })

            await dir.save({ session: mongooseSession });
            session = await Session.create([{ userId }], { session: mongooseSession });
            console.log(session);
            await mongooseSession.commitTransaction();
        } catch (err) {
            await mongooseSession.abortTransaction();
            throw err;
        } finally {
            await mongooseSession.endSession();
        }
    }


    res.cookie("sessionId", session.id, {
        signed: true,
        httpOnly: true,
        maxAge: 60 * 1000 * 60 * 24 * 7
    });

    return res.status(200).json(new ApiResponse(200, { success: true, message: "Login successful" }));

})


export { sendOTP, verifyOTP, loginWithGoogle }