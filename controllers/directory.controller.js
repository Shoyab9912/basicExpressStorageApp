import mongoose from "mongoose";
import Directory from "../models/directory.model.js";
import File from "../models/file.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import path from "node:path";
import getAccess from "../utils/getAccess.js";
import { updateParentDirectorySize } from "./file.controller.js";
import { deleteResources } from "../services/s3.service.js";


const getDirectory = asyncHandler(async (req, res) => {
  const user = req.user;
  const id = req.params.id ?? user.rootDirId;

  const dirData = await Directory.findById(id);

  if (!dirData) {
    throw new NotFoundError("Directory not found");
  }

  const access = getAccess(req.user?._id, dirData);

  if (!access) {
    throw new ForbiddenError("Directory access denied");
  }

  const files = await File.find({ parentDirId: dirData._id }).lean();
  const directories = await Directory.find({ parentDirId: id }).lean();

  return res.status(200).json(
    new ApiResponse(200, "Directory fetched", {
      ...dirData,
      files: files.map(({ _id, ...rest }) => ({ id: _id, ...rest })),
      directories: directories.map(({ _id, ...rest }) => ({
        id: _id,
        ...rest,
      })),
    }),
  );
});

const createDirectory = asyncHandler(async (req, res) => {
  const user = req.user;
  const parentDirId = req.params.parentDirId
    ? new mongoose.Types.ObjectId(req.params.parentDirId)
    : user.rootDirId;

  const dirName = req.headers.dirname || "newFolder";

  const parentDir = await Directory.findOne({
    _id: parentDirId,
  });

  if (!parentDir) {
    throw new NotFoundError("Directory doesn't exists");
  }

  const dirPath = parentDir.path ?? [];

  const access = getAccess(req.user._id, parentDir);

  if (access !== "owner" && access !== "editor") {
    throw new ForbiddenError("Access denied");
  }

  const documentId = new mongoose.Types.ObjectId();

  await Directory.create({
    _id: documentId,
    userId: parentDir.userId,
    name: dirName,
    parentDirId,
    path: [...dirPath, documentId],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Directory created successfully"));
});

const updateDirectoryName = asyncHandler(async (req, res) => {
  const { dirId } = req.params;
  const { newDirName } = req.body;
  const user = req.user;

  if (!newDirName || newDirName.trim() === "") {
    throw new ValidationError("Directory name is required");
  }

  const dirData = await Directory.findById(dirId);

  if (!dirData) {
    throw new NotFoundError("Directory doesn't exist");
  }
  const access = getAccess(req.user?._id, dirData);

  if (access !== "owner" && access !== "editor") {
    throw new ForbiddenError("you cant access this resource");
  }

  const updated = await Directory.findOneAndUpdate(
    { _id: dirId,},
    { name: newDirName },
    { returnDocument: "after" },
  );

  if (!updated) {
    throw new NotFoundError("directory doesn't exists");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Directory renamed successfully", updated));
});

const deleteDirRecursively = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const dirData = await Directory.findById(id);

  if (!dirData) {
    throw new NotFoundError("Directory doesn't exist");
  }

  const access = getAccess(req.user?._id, dirData);

  if (access !== "owner" && access !== "editor") {
    throw new ForbiddenError("Access denied");
  }

  const { files, allDirIds } = await getDirRecursively(dirData._id);
  console.log(files,"---------------")

  if (files.length > 0) {
    await File.deleteMany({
      _id: { $in: [...allDirIds, dirData._id] },
    });
  
    const keys = files.map(({_id,extension}) => ({
      Key:`${_id.toString()}${extension}`
    }))
  
    
    await deleteResources(keys)
  }

  await Directory.deleteMany({
    _id: { $in: [...allDirIds, dirData._id] },
  });

  await updateParentDirectorySize(dirData.parentDirId, -dirData.size);

  return res
    .status(200)
    .json(new ApiResponse(200, "Directory deleted successfully"));
});

async function getDirRecursively(rootId) {
  const directoriess = await Directory.aggregate([
    {
      $match: {
        _id: rootId,
      },
    },
    {
      $graphLookup: {
        from: "directories",
        connectFromField: "_id",
        connectToField: "parentDirId",
        startWith: "$_id",
        as: "directories",
      },
    },
  ]);

  const allDirIds = directoriess[0].directories.map(({ _id }) => _id);

  const files = await File.find(
    {
      parentDirId: {
        $in: [...allDirIds, rootId],
      },
    },
    {
      extension: 1,
    },
  ).lean();
  console.log("Files to delete:", files);
  return { files, allDirIds };
}

const getBreadCrumb = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dir = await Directory.findById(id);

  if (!dir) {
    throw new NotFoundError("Directory doesn't exist");
  }

  const access = getAccess(req.user?._id, dir);

  if (!access) {
    throw new ForbiddenError("You can't access this resource");
  }

  const dirPathIds = dir.path ?? [];

  const directories = await Directory.find(
    {
      _id: {
        $in: dirPathIds,
      },
    },
    {
      name: 1,
    },
  );

  const directoryMap = new Map();

  for (const directory of directories) {
    directoryMap.set(directory._id.toString(), directory);
  }


  const orderedDirectories = [];

  for (const id of dirPathIds) {
    const directory = directoryMap.get(id.toString());

    if (directory) {
      orderedDirectories.push(directory);
    }
  }

  return res.status(200).json(new ApiResponse(200, "success", orderedDirectories));
});

export {
  createDirectory,
  getDirectory,
  deleteDirRecursively,
  updateDirectoryName,
  getBreadCrumb,
};
