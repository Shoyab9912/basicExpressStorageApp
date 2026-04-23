import { sendOTPEmail } from "../utils/nodemailer.js";
import { UnauthorizedError, ValidationError } from "../utils/errors.js";
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
        if(user.isDeleted) {
            throw new UnauthorizedError("User account has been deleted");
        }
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

    const sessionId = session._id?.toString() ?? session[0]?._id.toString();

    console.log(session);
    res.cookie("sessionId", sessionId, {
        signed: true,
        httpOnly: true,
        maxAge: 60 * 1000 * 60 * 24 * 7
    });

    return res.status(200).json(new ApiResponse(200, { success: true, message: "Login successful" }));

})


const gitHubLogin = asyncHandler(async (req, res) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GIT_CLIENT_ID}&scope=user:email`;
    res.redirect(url);
})

const gitHubCallback = asyncHandler(async (req, res) => {
    const { code } = req.query;
    if (!code) {
        throw new ValidationError("Code is required");
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            client_id: process.env.GIT_CLIENT_ID,
            client_secret: process.env.GIT_SECRET,
            code
        })
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
        throw new Error("GitHub authentication failed")
    }
    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://api.github.com/user", {
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });


    const emailResponse = await fetch("https://api.github.com/user/emails", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });

    const { name, avatar_url } = await userResponse.json();
    const emailData = await emailResponse.json();
    const primaryEmailObj = emailData.find(emailObj => emailObj.primary && emailObj.verified);

    if (!primaryEmailObj) {
        throw new ValidationError("No verified primary email found in GitHub account");
    }
    const email = primaryEmailObj.email;
    // console.log(email, name, avatar_url);

    let user = await User.findOne({ email });
    let session;
    if (user) {
         if(user.isDeleted) {
            throw new UnauthorizedError("User account has been deleted");
        }
        session = await Session.create({ userId: user._id })
        console.log(session);
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
                picture: avatar_url,
                rootDirId,
                loginProvider: "github"
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
            await mongooseSession.commitTransaction();
        } catch (err) {
            await mongooseSession.abortTransaction();
            throw err;
        } finally {
            await mongooseSession.endSession();
        }
    }
    const sessionId = session?._id.toString() ?? session[0]?._id.toString();
    res.cookie("sessionId", sessionId, {
        signed: true,
        httpOnly: true,
        maxAge: 60 * 1000 * 60 * 24 * 7
    });
    return res.redirect(process.env.CLIENT_URL);
})





export { sendOTP, verifyOTP, loginWithGoogle, gitHubLogin, gitHubCallback }