import mongoose, { isValidObjectId } from "mongoose";
import Directory from "../models/directory.model.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Session from "../models/session.model.js";
import * as z from "zod";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors.js";
import File from "../models/file.model.js";
import { rm } from "fs/promises";
import path from "node:path";
import { registerSchema } from "../validators/authSchema.validator.js";
import redis from "../config/redis.js";

import { loginSchema } from "../validators/authSchema.validator.js";

const userRegister = asyncHandler(async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);
  console.log(req.body,data,"data received in userRegister--------------------------------------------")

  if (!success) {
    throw new ValidationError("input all fields", error.flatten().fieldErrors);
  }
  const { email, password, name, otp } = data;

  console.log(req.body,data,"data received in userRegister--------------------------------------------")

  if ([email, password, name, otp].some((f) => !f || f.trim() === "")) {
    throw new ValidationError("All fields are required");
  }

  const isOtpExists = await redis.get(`otp:${email}`);

  if (!isOtpExists) {
    throw new NotFoundError("Invalid OTP or OTP has expired");
  }

  if (isOtpExists !== otp) {
    throw new NotFoundError("Invalid OTP or OTP has expired");
  }

 

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.exists({ email });

    if (user) {
      throw new ConflictError("User already exists");
    }

    const userId = new mongoose.Types.ObjectId();
    const rootDirId = new mongoose.Types.ObjectId();

    await Directory.create(
      [
        {
          _id: rootDirId,
          parentDirId: null,
          name: `root-${email}`,
          userId,
          path: [rootDirId],
        },
      ],
      { session },
    );

    await User.create(
      [
        {
          _id: userId,
          name,
          email,
          password,
          rootDirId,
        },
      ],
      { session },
    );

    await session.commitTransaction();
     await redis.del(`otp:${email}`);

    return res
      .status(201)
      .json(new ApiResponse(201, "Successfully user registered"));
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 121) {
      throw new ValidationError("Invalid fields");
    }
    throw err;
  } finally {
    await session.endSession();
  }
});

const login = asyncHandler(async (req, res) => {
  const { success, data } = loginSchema.safeParse(req.body);
  if (!success) {
    throw new ValidationError("input credientials");
  }

  const { email, password } = data;

  if ([email, password].some((f) => !f || f.trim() === "")) {
    throw new ValidationError("All fields are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  if (user.isDeleted) {
    throw new UnauthorizedError("User account has been deleted");
  }

  const isPasswordMatched = await user.verifyPassword(password);

  if (!isPasswordMatched) {
    throw new UnauthorizedError("Invalid Credentials");
  }

  const session = await Session.create({ userId: user._id });

  res.cookie("sessionId", session._id.toString(), {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return res.status(200).json(new ApiResponse(200, "Login successful"));
});

const getNameAndEmail = asyncHandler(async (req, res) => {
 
  const rootDir = await Directory.findById(req.user.rootDirId)


  return res.status(200).json(
    new ApiResponse(200, "User fetched", {
      name: req.user.name,
      email: req.user.email,
      profile: req.user.picture,
      role: req.user.role,
      maxStorageInBytes: req.user. maxStorageInBytes,
      usedStorageInBytes: rootDir.size,
    }),
  );
});

const logout = asyncHandler(async (req, res) => {
  const sessionId = req.signedCookies.sessionId;

  await Session.deleteOne({ _id: sessionId });

  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return res.sendStatus(204);
});

const adminLogout = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await Session.deleteMany({ userId });
  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
  });
  return res.sendStatus(204);
});

const logoutAll = asyncHandler(async (req, res) => {
  await Session.deleteMany({ userId: req.user._id });
  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return res.sendStatus(204);
});

const softDeleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findByIdAndUpdate(userId, { isDeleted: true });
  const session = await Session.deleteMany({ userId });
  return res
    .status(200)
    .json(new ApiResponse(200, "User deleted successfully"));
});



export {
  userRegister,
  login,
  getNameAndEmail,
  logout,
  softDeleteUser,
};
