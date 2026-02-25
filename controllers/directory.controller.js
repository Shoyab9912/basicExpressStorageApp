import mongoose from 'mongoose'
import { rm } from "node:fs/promises";
import Directory from "../models/directory.model.js";
import File from "../models/file.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const getDirectory = asyncHandler(async (req, res) => {
  const user = req.user;
  const id = req.params.id ?? user.rootDirId;

  const dirData = await Directory.findById(id).lean();

  if (!dirData) {
    throw new NotFoundError("Directory not found");
  }

  const files = await File.find({ parentDirId: dirData._id }).lean();
  const directories = await Directory.find({ parentDirId: id }).lean();

  return res.status(200).json(
    new ApiResponse(200, "Directory fetched", {
      ...dirData,
      files: files.map(file => ({ ...file, id: file._id })),
      directories: directories.map(dir => ({ ...dir, id: dir._id })),
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
  const { id } = req.params;
  const { newDirName } = req.body;
  const user = req.user;

  if (!newDirName || newDirName.trim() === "") {
    throw new ValidationError("Directory name is required");
  }

  const dirData = await Directory.findOneAndUpdate(
    { _id: id, userId: user._id },
    { $set: { name: newDirName } },
    { returnDocument: "after" }
  );

  if (!dirData) {
    throw new NotFoundError("Directory");
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
    for (let { _id, extension } of files) {
      await rm(`./storage/${_id.toString()}${extension}`, { force: true });
    }

    await File.deleteMany({
      _id: { $in: files.map(f => f._id) },
    });
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