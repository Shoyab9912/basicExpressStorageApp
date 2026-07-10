import path from "node:path";
import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import File from "../models/file.model.js";
import Directory from "../models/directory.model.js";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import getAccess from "../utils/getAccess.js";

function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase);
  const target = path.resolve(base, part);

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new ApiError(400, "Invalid file path");
  }

  return target;
}

export async  function  updateParentDirectorySize(parentId, sizeChange) {
    while(parentId) {
      const parentdir = await Directory.findById(parentId);
      if (!parentdir) break;
      parentdir.size += sizeChange;
      await parentdir.save();
      parentId = parentdir.parentDirId;
    }

}

const serveFile = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  const file = await File.findById(id);
  if (!file) throw new NotFoundError("File doesn't exist");

  const access = getAccess(req.user?._id, file);

  if (!access) {
    throw new UnauthorizedError("you cant access this resource");
  }

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

  const file = await File.findById(id);
  if (!file) throw new NotFoundError("File doesn't exist");

  const access = getAccess(req.user?._id, file);

  if (!access) {
    throw new UnauthorizedError("you cant access this resource");
  }

  const filePath = safeStoragePath(req, id);

  if (req.query.action === "download") {
    return res.download(`${filePath}${file.extension}`, file.name);
  }
});

const MAX_FILE_SIZE =  50 * 1024 * 1024; // Default to 50MB if not set

const uploadFile = asyncHandler(async (req, res, next) => {
  const user = req.user;

  const parentDirId = req.params.parentDirId ?? user.rootDirId;

  const dirData = await Directory.findById(parentDirId);
  if (!dirData) throw new NotFoundError("Directory doesn't exist");

  const access = getAccess(req.user._id, dirData);

  if (access !== "owner" && access !== "editor") {
    throw new UnauthorizedError("Access denied");
  }

  const fileName = path.basename(req.headers.filename || "uploaded_file");
  let fileSize = req.headers.filesize;

  const extension = path.extname(fileName);

  const fileData = await File.create({
    extension,
    name: fileName,
    size: fileSize,
    userId: user._id,
    parentDirId: dirData._id,
  });



  const fileId = fileData._id.toString();
  const fullPath = safeStoragePath(req, `${fileId}${extension}`);
  const writeStream = createWriteStream(fullPath);

  let totalFileSize = 0;
  let aborted = false;

  async function cleanUp(err) {
    if (aborted) return;
    aborted = true;
    writeStream.destroy();
    await rm(fullPath, { force: true });
    await File.findByIdAndDelete(fileId);
    next(err);
  }

  req.on("data", (chunk) => {
    totalFileSize += chunk.length;
    if (aborted) return;
    if (totalFileSize > MAX_FILE_SIZE) {
      console.log("working")
      req.unpipe(writeStream);
      req.destroy();
      cleanUp("file size exceed maximum limit");
    }
  });

  req.on("error", async (err) => {
    await rm(fullPath, { force: true });
    await File.findByIdAndDelete(fileId);
    console.error("Request error during file upload:", err);
    next(err);
  });

  req.pipe(writeStream);

  writeStream .on("finish", async () => {
   await updateParentDirectorySize(parentDirId, totalFileSize);
    return res
      .status(201)
      .json(new ApiResponse(201, "File uploaded successfully"));
  });

  writeStream.on("error", async (err) => {
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

  const file = await File.findById(id);
  if (!file) throw new NotFoundError("File doesn't exist");

  const access = getAccess(req.user?._id, file);

  if (access !== "owner" && access !== "editor") {
    throw new UnauthorizedError("you cant access this resource");
  }

  const renamedFile = await File.findOneAndUpdate(
    { _id: id },
    { $set: { name: newFilename } },
    { returnDocument: "after", projection: { name: 1, extension: 1 } },
  );

  if (!renamedFile) {
    throw new NotFoundError("resource not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "File renamed successfully", renamedFile));
});

const deleteFile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const file = await File.findById(id);

  if (!file) throw new NotFoundError("File doesn't exist");

  const access = getAccess(req.user?._id, file);

  if (access !== "owner" && access !== "editor") {
    throw new UnauthorizedError("you cant access this resource");
  }

  const filePath = safeStoragePath(req, id);
  await rm(`${filePath}${file.extension}`, { force: true });

  const f = await File.deleteOne({ _id: file._id });

  if (f.deletedCount === 0) {
    throw new ApiError(500, "Internal server error");
  }

  await updateParentDirectorySize(file.parentDirId, -file.size);

  return res.status(204).send();
});

export { serveFile, downloadFile, uploadFile, renameFile, deleteFile };
