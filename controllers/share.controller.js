import Directory from "../models/directory.model.js";
import File from "../models/file.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import getAccess from "../utils/getAccess.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import crypto from "node:crypto";
import path from "node:path"

function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase);
  const target = path.resolve(base, part);

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new ApiError(400, "Invalid file path");
  }

  return target;
}

const shareViaEmail = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params;
  const { email, permission } = req.body;

  console.log(req.body, req.params);

  if (
    [resourceType, resourceId, email, permission].some(
      (f) => !f || String(f).trim() === "",
    )
  ) {
    throw new ValidationError("Input all fields");
  }

  const Model = resourceType === "file" ? File : Directory;
  const sharedResource = await Model.findById(resourceId);

  if (!sharedResource) {
    throw new NotFoundError("Resource doesn't exists");
  }

  const role = getAccess(req.user?._id, sharedResource);

  if (!role || role == "viewer") {
    throw new UnauthorizedError("you cant access this resource");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user._id.equals(sharedResource.userId)) {
    throw new BadRequestError("Cannot share with the owner");
  }

  if (user._id.equals(req.user._id)) {
    throw new BadRequestError("Cannot share with yourself");
  }

  const alreadyShared = sharedResource.sharedWith.some((u) =>
    u.userId.equals(user._id),
  );

  if (alreadyShared) {
    throw new BadRequestError(
      "User already has access, use update permission instead",
    );
  }

  const result = await Model.findByIdAndUpdate(
    resourceId,
    {
      $push: {
        sharedWith: {
          userId: user._id,
          permission,
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new NotFoundError("Resource doesnt exist");
  }
  return res.status(201).json(new ApiResponse(201, result));
});

const revokeAccessViaEmail = asyncHandler(async (req, res) => {
  const { resourceType, resourceId, userId } = req.params;

  if (!resourceType || !resourceId || !userId) {
    throw new ValidationError("All fields are required");
  }

  const Model = resourceType === "file" ? File : Directory;

  const resource = await Model.findById(resourceId);

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  const access = getAccess(req.user._id, resource);

  if (access !== "owner") {
    throw new UnauthorizedError("forbidden to acceess");
  }

  const initialLength = resource.sharedWith.length;
  resource.sharedWith = resource.sharedWith.filter(
    (u) => !u.userId.equals(userId),
  );

  if (initialLength === resource.sharedWith.length) {
    throw new NotFoundError("user not found");
  }
  await resource.save();
  return res
    .status(200)
    .json(new ApiResponse(200, "Access revoked successfully"));
});

const updatePermission = asyncHandler(async (req, res) => {
  const { resourceType, resourceId, userId } = req.params;

  const { permission } = req.body;

  if (!resourceType || !resourceId || !userId || !permission) {
    throw new ValidationError("All fields are required");
  }

  const Model = resourceType === "file" ? File : Directory;

  const resource = await Model.findById(resourceId);

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  const access = getAccess(req.user._id, resource);

  if (access !== "owner") {
    throw new UnauthorizedError("forbidden to acceess");
  }
  const targetId = new mongoose.Types.ObjectId(userId);
  const update = await Model.updateOne(
    {
      _id: resource._id,
      "sharedWith.userId": targetId,
    },
    {
      $set: {
        "sharedWith.$.permission": permission,
      },
    },
  );

  if (update.modifiedCount === 0) {
    throw new NotFoundError("User not found in shared list");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "successfully update the permission"));
});

const getAllSharedUsers = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params;

  if (!resourceType || !resourceId) {
    throw new ValidationError("All fields are required");
  }

  const Model = resourceType === "file" ? File : Directory;

  const resource = await Model.findById(resourceId).populate(
    "sharedWith.userId",
    " name email ",
  );

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  const access = getAccess(req.user._id, resource);

  if (access !== "owner") {
    throw new UnauthorizedError("forbidden to acceess");
  }
  return res.status(200).json(new ApiResponse(200, resource.sharedWith));
});

const createShareLink = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params;

  const { permission, expiresIn = 7 } = req.body;

  if (!resourceType || !resourceId || !permission) {
    throw new ValidationError("All fields are required");
  }

  const Model = resourceType === "file" ? File : Directory;

  const resource = await Model.findById(resourceId);

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  const access = getAccess(req.user._id, resource);
  console.log(access);

  if (!access || access === "viewer") {
    throw new UnauthorizedError("forbidden to access");
  }

  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (expiresIn || 7));

  resource.shareLink = {
    token,
    permission,
    expiresAt,
  };
  resource.save();
  return res.status(200).json(
    new ApiResponse(200, "share link generated ", {
      link: `${process.env.BASEUURL}/share/acess/${token}`,
      expiresAt,
    }),
  );
});

const revokeShareLink = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params;

  if (!resourceType || !resourceId) {
    throw new ValidationError("All fields are required");
  }

  const Model = resourceType === "file" ? File : Directory;

  const resource = await Model.findById(resourceId);

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  const access = getAccess(req.user?._id, resource, null);

  if (access !== "owner") {
    throw new UnauthorizedError("Youy cant revoke it");
  }

  if (!resource.shareLink?.token) {
    throw new NotFoundError("No share link found");
  }

  resource.shareLink = undefined;
  await resource.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Share link revoked successfully"));
});

const acceessViaLink = asyncHandler(async (req, res) => {
  const { token } = req.params;

  let resource = await File.findOne({ "shareLink.token": token });

  let resourceType = "File";
  if (!resource) {
    resource = await Directory.findOne({ "shareLink.token": token });
    resourceType = "Directory";
  }

  if (!resource) throw new NotFoundError("Invalid or expired link");

  if (
    resource.shareLink.expiresAt &&
    resource.shareLink.expiresAt < Date.now()
  ) {
    throw new UnauthorizedError("Link has expired");
  }

  if (resourceType === "File") {
    const filePath = safeStoragePath(req, resource._id.toString());
    return res.sendFile(`${filePath}${resource.extension}`, (err) => {
      if (!res.headersSent && err) {
        next(new NotFoundError("File not found"));
      }
    });
  }

  if (resourceType === "Directory") {
    const files = await File.find({ parentDirId: resource._id }).lean();
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Directory fetched", {
          directory: resource,
          files,
        }),
      );
  }
});

export {
  shareViaEmail,
  revokeAccessViaEmail,
  updatePermission,
  getAllSharedUsers,
  createShareLink,
  revokeShareLink,
  acceessViaLink
};
