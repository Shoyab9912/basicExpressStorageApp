import mongoose from "mongoose"
import Directory from "../models/directory.model.js";
import User from "../models/user.model.js"
import crypto from "node:crypto";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ValidationError, ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors.js";

const userRegister = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if ([email, password, name].some(f => !f || f.trim() === "")) {
    throw new ValidationError("All fields are required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ email });

    if (user) {
      throw new ConflictError("User already exists");
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest("hex");

    const userId = new mongoose.Types.ObjectId();
    const rootDirId = new mongoose.Types.ObjectId();

    await Directory.insertOne({
      _id: rootDirId,
      parentDirId: null,
      name: `root-${email}`,
      userId
    }, { session });

    await User.insertOne({
      _id: userId,
      name,
      email,
      password: hashedPassword,
      rootDirId
    }, { session });

    await session.commitTransaction();

    return res.status(201).json(new ApiResponse(201, "Successfully user registered"));

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
  const { email, password } = req.body;

  if ([email, password].some(f => !f || f.trim() === "")) {
    throw new ValidationError("All fields are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const hashedPassword = crypto.createHash('sha256').update(password).digest("hex");

  if (user.password !== hashedPassword) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const cookieData = JSON.stringify({
    id: user._id.toString(),
    expiry: Math.round(Date.now() / 1000 * 60)
  });

  res.cookie("token", cookieData, {
    signed: true,
    httpOnly: true,
    maxAge: 60 * 1000 * 60 * 24 * 7
  });

  
  return res.status(200).json(new ApiResponse(200, "Login successful"));
});

const getNameAndEmail = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, "User fetched", {
      name: req.user.name,
      email: req.user.email
    })
  );
});

const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    signed: true,
  });
  return res.sendStatus(204);
};

export {
  userRegister,   
  login,
  getNameAndEmail,
  logout
};