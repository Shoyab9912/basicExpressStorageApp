import mongoose, { isValidObjectId } from "mongoose"
import Directory from "../models/directory.model.js";
import User from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Session from "../models/session.model.js";
import OTP from "../models/otp.model.js";
import { ValidationError, ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors.js";
import File from "../models/file.model.js";
import { rm } from "fs/promises";
import path from "node:path";
import e from "express";

function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase);
  const target = path.resolve(base, part);

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new ApiError(400, "Invalid file path");
  }

  return target;
}



const userRegister = asyncHandler(async (req, res) => {
  const { email, password, name, otp } = req.body;

  if ([email, password, name, otp].some(f => !f || f.trim() === "")) {
    throw new ValidationError("All fields are required");
  }


  const isOtpExists = await OTP.exists({ email, otp })

  if (!isOtpExists) {
    throw new NotFoundError("Invalid OTP or OTP has expired")
  }

  await OTP.deleteOne({ email, otp })

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.exists({ email })

    if (user) {
      throw new ConflictError("User already exists");
    }



    const userId = new mongoose.Types.ObjectId();
    const rootDirId = new mongoose.Types.ObjectId();

    await Directory.create([{
      _id: rootDirId,
      parentDirId: null,
      name: `root-${email}`,
      userId
    }], { session });

    await User.create([{
      _id: userId,
      name,
      email,
      password,
      rootDirId
    }], { session });

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

  const user = await User.findOne({ email })

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  if (user.deleted) {
    throw new UnauthorizedError("User account has been deleted");
  }

  const isPasswordMatched = await user.verifyPassword(password)

  if (!isPasswordMatched) {
    throw new UnauthorizedError("Invalid Credentials")
  }

  const session = await Session.create({ userId: user._id });

  res.cookie("sessionId", session.id, {
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
      email: req.user.email,
      profile: req.user.picture,
      role: req.user.role
    })
  );
});

const logout = asyncHandler(async (req, res) => {
  await Session.findByIdAndDelete(req.signedCookies.sessionId);
  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
    maxAge: 60 * 1000 * 60 * 24 * 7
  });
  return res.sendStatus(204);
});


const adminLogout = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  await Session.deleteMany({ userId })
  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
  })
  return res.sendStatus(204);
})



const logoutAll = asyncHandler(async (req, res) => {
  await Session.deleteMany({ userId: req.user._id });
  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
    maxAge: 60 * 1000 * 60 * 24 * 7
  });
  return res.sendStatus(204);
});

const getAllUsers = asyncHandler(async (req, res) => {

  const users = await User.find().lean().select("name email picture role");
  const userSessions = await Session.find({ userId: { $in: users.map(u => u._id) } }).lean();
  const allSessions = new Set(userSessions.map(s => s.userId.toString()));
  const usersWithStatus = users.map(u => {
    return {
      id: u._id,
      name: u.name,
      email: u.email,
      isLoggedIn: allSessions.has(u._id.toString())
    }
  })
  return res.status(200).json(new ApiResponse(200, "Users fetched", usersWithStatus));

})


const softDeleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findByIdAndUpdate(userId, { isDeleted: true })
  const session = await Session.deleteMany({ userId })
  return res.status(200).json(new ApiResponse(200, "User deleted successfully"))

})


const hardDeleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const session = await Session.deleteMany({ userId })
  const user = await User.deleteOne({ _id: userId })
  const files = await File.find({ userId }, " extension ").lean()

  if (files.length > 0) {
    console.log(files);
    for (let { _id, extension } of files || []) {
      const filePath = safeStoragePath(req, _id.toString());
      console.log(filePath, extension);
      await rm(`${filePath}${extension}`, { force: true });
    }
    await File.deleteMany({ userId })
  }

  const directories = await Directory.deleteMany({ userId })
  return res.status(200).json(new ApiResponse(200, "User deleted successfully"))

})


const changeRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (req.user._id.toString() === userId) {
    throw new UnauthorizedError("Users cannot change their own role")
  }


  if (role === "Owner") {
    throw new UnauthorizedError("Cannot assign Owner role");
  }

  if (req.user.role === "Owner") {
    if (!["Admin", "Manager"].includes(role)) {
      throw new UnauthorizedError("Only owner can change roles to Admin or Manager")
    }
  } else if (req.user.role === "Admin") {
    if (role !== "Manager") {
      throw new UnauthorizedError("Only Admin can change roles to Manager")
    }
  } else {
    throw new UnauthorizedError("Only owner can change roles")
  }

  const user = await User.updateOne({
    _id: userId
  }, {
    $set: {
      role
    }
  })
  console.log(user);

  return res.status(200).json(new ApiResponse(200, "User role updated successfully"))
})

export {
  userRegister,
  login,
  getNameAndEmail,
  logout,
  logoutAll,
  getAllUsers,
  adminLogout,
  softDeleteUser,
  hardDeleteUser,
  changeRole
};