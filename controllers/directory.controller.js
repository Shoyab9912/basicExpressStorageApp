import mongoose from 'mongoose'
import { rm } from "node:fs/promises";
import Directory from "../models/directory.model.js";
import File from "../models/file.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import path from "node:path"


function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase);
  const target = path.resolve(base, part);

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new Error("Invalid path");
  }

  return target;
}

const getDirectory = asyncHandler(async (req, res) => {
  const user = req.user;
  const id = req.params.id ?? user.rootDirId;

  const dirData = await Directory.findOne({ _id: id, userId: user._id }).lean();

  if (!dirData) {
    throw new NotFoundError("Directory not found");
  }

  const files = await File.find({ parentDirId: dirData._id }).lean();
  const directories = await Directory.find({ parentDirId: id }).lean();

  return res.status(200).json(
    new ApiResponse(200, "Directory fetched", {
      ...dirData,
      files: files.map(({ _id, ...rest }) => ({ id: _id, ...rest })),
      directories: directories.map(({ _id, ...rest }) => ({ id: _id, ...rest })),
    })
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
    userId: user._id,
  });

  if (!parentDir) {
    throw new NotFoundError("Parent directory");
  }

  await Directory.create({
    userId: user._id,
    name: dirName,
    parentDirId,
  });

  return res.status(201).json(
    new ApiResponse(201, "Directory created successfully")
  );
});

const updateDirectoryName = asyncHandler(async (req, res) => {

  const { dirId } = req.params;
  const { newDirName } = req.body;
  const user = req.user;

  if (!newDirName || newDirName.trim() === "") {
    throw new ValidationError("Directory name is required");
  }

  const dirData = await Directory.findOneAndUpdate(
    { _id: dirId, userId: user._id },
    { name: newDirName },
    { new: true }
  );

  if (!dirData) {
    throw new NotFoundError("directory doesn't exists")
  }
  return res.status(200).json(
    new ApiResponse(200, "Directory renamed successfully", dirData)
  );
});


const deleteDirRecursively = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const dirData = await Directory.findOne({
    _id: id,
    userId: user._id,
  });

  if (!dirData) {
    throw new NotFoundError("Directory");
  }

  const { files, directories } = await getDirRecursively(dirData._id);


  if (files.length > 0) {

    await File.deleteMany({
      _id: { $in: files.map(f => f._id) },
    });

    for (let { _id, extension } of files) {
      const filePath = safeStoragePath(req, `${_id.toString()}${extension}`);
      await rm(filePath, { force: true });
    }


  }

  await Directory.deleteMany({
    _id: { $in: [...directories.map(d => d._id), dirData._id] },
  });

  return res.status(200).json(
    new ApiResponse(200, "Directory deleted successfully")
  );
});

async function getDirRecursively(id) {
  let files = await File.find({ parentDirId: id }, { extension: 1 }).lean();
  let directories = await Directory.find({ parentDirId: id }, { _id: 1 }).lean();

  const currentDirectories = [...directories];

  for (let { _id } of currentDirectories) {
    const { files: childFiles, directories: childDirs } = await getDirRecursively(_id);
    files.push(...childFiles);
    directories.push(...childDirs);
  }

  return { files, directories };
}

export {
  createDirectory,
  getDirectory,
  deleteDirRecursively,
  updateDirectoryName,
};