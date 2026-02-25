import path from "node:path";
import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import File from "../models/file.model.js";
import Directory from "../models/directory.model.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase);
  const target = path.resolve(base, part);

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new Error("Invalid path");
  }

  return target;
}


const serveOrDownloadFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const file = await File.findOne({ _id: id, userId: user._id });

  if (!file) throw new NotFoundError("File doesn't exist");

  const filePath = safeStoragePath(req, id);

  if (req.query.action === "download") {
    return res.download(`${filePath}${file.extension}`, file.name);
  }

  return res.sendFile(`${filePath}${file.extension}`, (err) => {
    if (!res.headersSent && err) {
      throw new NotFoundError("File not found"); 
    }
  });
});


const uploadFile = asyncHandler(async (req, res, next) => {
  const user = req.user;

  const parentDirId = req.params.parentDirId ?? user.rootDirId;

  const dirData = await Directory.findOne({
    _id: parentDirId,
    userId: user._id
  });

  if (!dirData) {
    throw new NotFoundError("Directory doesn't exist"); // ✅ check after query
  }

  const fileName = req.headers.filename || "file";
  const extension = path.extname(fileName);

  const fileData = await File.insertOne({
    extension,
    name: fileName,
    userId: user._id,
    parentDirId: dirData._id
  });

  const fileId = fileData.id;
  const fullPath = `./storage/${fileId}${extension}`;
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
    { returnDocument: "after" }
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

  if (!file) {
    throw new NotFoundError("File doesn't exist");
  }

  const filePath = safeStoragePath(req, id);
  await file.deleteOne();
  await rm(`${filePath}${file.extension}`, { force: true });

  
  return res.status(204).json(new ApiResponse(204, "File deleted successfully"));
});

export {
  serveOrDownloadFile,
  uploadFile,
  renameFile,
  deleteFile
};