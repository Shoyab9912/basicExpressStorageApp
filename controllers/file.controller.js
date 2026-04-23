import path from "node:path";
import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import File from "../models/file.model.js";
import Directory from "../models/directory.model.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase);
  const target = path.resolve(base, part);

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new ApiError(400, "Invalid file path");
  }

  return target;
}


const serveFile = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  const file = await File.findOne({ _id: id, userId: user._id }).lean();

  if (!file) throw new NotFoundError("File doesn't exist");

  const filePath = safeStoragePath(req, id);

  return res.sendFile(`${filePath}${file.extension}`, (err) => {
    if (!res.headersSent && err) {
      next(new NotFoundError("File not found"));
    }
  });
});



const downloadFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const file = await File.findOne({ _id: id, userId: user._id }).lean();

  if (!file) throw new NotFoundError("File doesn't exist");

  const filePath = safeStoragePath(req, id);

  if (req.query.action === "download") {
    return res.download(`${filePath}${file.extension}`, file.name);
  }

});


const uploadFile = asyncHandler(async (req, res, next) => {
  const user = req.user;

  const parentDirId = req.params.parentDirId ?? user.rootDirId;

  const dirData = await Directory.findOne({
    _id: parentDirId,
    userId: user._id
  }).lean()

  if (!dirData) {
    throw new NotFoundError("Directory doesn't exist");
  }

  const fileName = path.basename(req.headers.filename || "file");
  const extension = path.extname(fileName);

  const fileData = await File.create({
    extension,
    name: fileName,
    userId: user._id,
    parentDirId: dirData._id
  });

  const fileId = fileData._id.toString();
  const fullPath = safeStoragePath(req, `${fileId}${extension}`);
  const writeStream = createWriteStream(fullPath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    return res.status(201).json(new ApiResponse(201, "File uploaded successfully"));
  });

  writeStream.on("error", async (err) => {
    await rm(fullPath, { force: true });
    await File.findByIdAndDelete(fileId);
    next(err);
  });

  req.on("error", async (err) => {
    await rm(fullPath, { force: true });
    await File.findByIdAndDelete(fileId);
    next(err);
  });
});

const renameFile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { newFilename } = req.body;

  if (!newFilename || !newFilename.trim()) {
    throw new ValidationError("Filename is required");
  }

  const renamedFile = await File.findOneAndUpdate(
    { _id: id, userId: user._id },
    { $set: { name: newFilename } },
    { returnDocument: "after", projection: { name: 1, extension: 1 } }
  );

  if (!renamedFile) {
    throw new NotFoundError("File");
  }


  return res.status(200).json(new ApiResponse(200, "File renamed successfully", renamedFile));
});


const deleteFile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const file = await File.findOne({
    _id: id,
    userId: user._id
  }).select("extension");
  console.log(file)
  if (!file) {
    throw new NotFoundError("File doesn't exist");
  }

  const filePath = safeStoragePath(req, id);
  await rm(`${filePath}${file.extension}`, { force: true });

  const f = await File.deleteOne({ _id: file._id });

  if (f.deletedCount === 0) {
    throw new ApiError(500, "Internal server error")
  }



  return res.status(204).send()
});

export {
  serveFile,
  downloadFile,
  uploadFile,
  renameFile,
  deleteFile
};