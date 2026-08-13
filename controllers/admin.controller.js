import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { UnauthorizedError, NotFoundError,BadRequestError,ForbiddenError } from "../utils/errors.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import File from "../models/file.model.js";
import Directory from "../models/directory.model.js";
import {
  deleteResources,
  createGetSignedUrl,
  deleteResource,
} from "../services/s3.service.js";
import { ROLES } from "../constants/roles.js";
import { updateParentDirectorySize } from "./file.controller.js";

const adminLogout = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await Session.deleteMany({ userId });
  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res.sendStatus(204);
});

const logoutAll = asyncHandler(async (req, res) => {
  await Session.deleteMany({ userId: req.user._id });
  res.clearCookie("sessionId", {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res.sendStatus(204);
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().lean().select("name email picture role");
  const userSessions = await Session.find({
    userId: { $in: users.map((u) => u._id) },
  }).lean();
  const allSessions = new Set(userSessions.map((s) => s.userId.toString()));
  const usersWithStatus = users.map((u) => {
    return {
      id: u._id,
      name: u.name,
      email: u.email,
      isLoggedIn: allSessions.has(u._id.toString()),
    };
  });
  return res
    .status(200)
    .json(new ApiResponse(200, "Users fetched", usersWithStatus));
});

const hardDeleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const session = await Session.deleteMany({ userId });
  const user = await User.deleteOne({ _id: userId });
  const files = await File.find({ userId }, " extension ").lean();

  if (files.length > 0) {
    const keys = files.map(({ _id, extension }) => ({
      Key: `${_id.toString()}${extension}`,
    }));

    await deleteResources(keys);

    await File.deleteMany({ userId });
  }

  const directories = await Directory.deleteMany({ userId });
  return res
    .status(200)
    .json(new ApiResponse(200, "User deleted successfully"));
});

const changeRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER];

  if (!validRoles.includes(role)) {
    throw new BadRequestError("Invalid role");
  }

  if (req.user._id.toString() === userId) {
    throw new ForbiddenError("You cannot change your own role");
  }

  if (role === ROLES.OWNER) {
    throw new ForbiddenError("Cannot assign Owner role");
  }

  const targetUser = await User.findById(userId);

  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  if (targetUser.role === ROLES.OWNER) {
    throw new ForbiddenError("Owner role cannot be modified");
  }

  if (targetUser.role === role) {
    throw new BadRequestError("User already has this role");
  }

  switch (req.user.role) {
    case ROLES.OWNER:
      break;

    case ROLES.ADMIN:
      if (targetUser.role === ROLES.ADMIN) {
        throw new ForbiddenError("Cannot modify another Admin");
      }

      if (![ROLES.MANAGER, ROLES.USER].includes(role)) {
        throw new ForbiddenError("Admin can only assign Manager or User roles");
      }
      break;

    default:
      throw new ForbiddenError(
        "You don't have permission to change user roles",
      );
  }

  targetUser.role = role;
  await targetUser.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "User role updated successfully"));
});

const viewFiles = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const files = await File.find({ userId }).lean();
  return res
    .status(200)
    .json(new ApiResponse(200, "User files fetched", files));
});

const viewDirectories = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const directories = await Directory.find({ userId }).lean();
  return res
    .status(200)
    .json(new ApiResponse(200, "User directories fetched", directories));
});

const viewSingleFile = asyncHandler(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.fileId,
  }).lean();

  if (!file) {
    throw new NotFoundError("File not found");
  }

  const url = await createGetSignedUrl({
    key: `${file._id.toString()}${file.extension}`,
  });
  return res.redirect(url);
});

const deleteFile = asyncHandler(async (req, res) => {
  const { userId, fileId } = req.params;
  const file = await File.findOne({ _id: fileId, userId }).lean();
  if (!file) throw new NotFoundError("File not found");

  await deleteResource(`${file._id.toString()}${file.extension}`);
  await File.deleteOne({ _id: fileId });
  await updateParentDirectorySize(file.parentDirId, -file.size);
  return res
    .status(200)
    .json(new ApiResponse(200, "File deleted successfully"));
});

export {
  logoutAll,
  getAllUsers,
  adminLogout,
  hardDeleteUser,
  changeRole,
  viewFiles,
  viewDirectories,
  viewSingleFile,
  deleteFile,
};
