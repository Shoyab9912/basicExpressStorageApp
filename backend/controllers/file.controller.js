import path from "node:path";
import { createWriteStream } from "node:fs";
import File from "../models/file.model.js";
import Directory from "../models/directory.model.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
} from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import getAccess from "../utils/getAccess.js";

import {
  createGetSignedUrl,
  createSignedUrl,
  deleteResource,
  getFileMetaData,
} from "../services/s3.service.js";



export async function updateParentDirectorySize(parentId, sizeChange) {
  while (parentId) {
    const parentDir = await Directory.findByIdAndUpdate(
      parentId,
      { $inc: { size: sizeChange } }
    );

    if (!parentDir) break;

    parentId = parentDir.parentDirId;
  }
}

const serveFile = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  const file = await File.findById(id);
  if (!file) throw new NotFoundError("File doesn't exist");

  const access = getAccess(req.user?._id, file);
  if (!access) {
    throw new ForbiddenError("you cant access this resource");
  }

  const url = await createGetSignedUrl({ key: `${id}${file.extension}` });
  return res.redirect(url);
});

const downloadFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = await File.findById(id);
  if (!file) throw new NotFoundError("File doesn't exist");
  

  const access = getAccess(req.user?._id, file);
  if (!access) throw new ForbiddenError("you cant access this resource");

  const isDownload = req.query.action === "download";
  const url = await createGetSignedUrl({
    key: `${id}${file.extension}`,
    download: isDownload,
    fileName: file.name,
  });
  return res.redirect(url);
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
    throw new ForbiddenError("you cant access this resource");
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
    throw new ForbiddenError("you cant access this resource");
  }

  await deleteResource(`${file._id.toString()}${file.extension}`)

  const f = await File.deleteOne({ _id: file._id });

  if (f.deletedCount === 0) {
    throw new ApiError(500, "Internal server error");
  }
    
  await updateParentDirectorySize(file.parentDirId, -file.size);

  return res.status(204).send();
});

const uploadInitiate = asyncHandler(async (req, res) => {
  const user = req.user;

  const parentDirId = req.body.parentDirId ?? user.rootDirId;

  const dirData = await Directory.findById(parentDirId);


  if (!dirData) throw new NotFoundError("Directory doesn't exist");

  const access = getAccess(req.user._id, dirData);

  if (access !== "owner" && access !== "editor") {
    throw new ForbiddenError("Access denied");
  }

  const rootDir = await Directory.findById(user.rootDirId)

  if(!rootDir) {
    throw new NotFoundError("Directory doesn't exist");
  }

  const fileName = req.body.name || "uploaded_file";
  let fileSize = req.body.size;

  const size = user.maxStorageInBytes - rootDir.size;

  if (fileSize > size) {
    return res.status(507).json({ error: "Not enough storage" });
  }

  const extension = path.extname(fileName);

  const fileData = await File.insertOne({
    extension,
    name: fileName,
    size: fileSize,
    userId: user._id,
    parentDirId: dirData._id,
    isUploading: true,
  });
  const uploadSignedUrl = await createSignedUrl({
    key: `${fileData.id}${extension}`,
    contentType: req.body.contentType,
  });

  return res.status(200).json(
    new ApiResponse(200, "file uploading", {
      uploadSignedUrl,
      fileId: fileData.id,
    }),
  );
});

const uploadComplete = asyncHandler(async (req, res) => {
  const { fileId } = req.body;

  const file = await File.findById(fileId);

  if (!file) {
    throw new NotFoundError("file doesn't exists");
  }
  try {
    const data = await getFileMetaData(
      `${file._id.toString()}${file.extension}`,
    );

    if (data.ContentLength !== file.size) {
      await deleteResource(`${file._id.toString()}${file.extension}`)
      await File.findByIdAndDelete(file._id);
      throw new BadRequestError(
        "Uploaded file size doesn't match expected size",
      );
    }

    file.isUploading = false;
    await file.save()

    await updateParentDirectorySize(file.parentDirId,file.size)
    return res.status(200).json(new ApiResponse(200,"file uploaded sucessfully"))
  } catch (err) {
    if (err.name === "NotFound") {
      await File.findByIdAndDelete(file._id);
      throw new NotFoundError("File not found in storage");
    }
    throw err;
  }
});

const cancelUpload = asyncHandler(async (req, res) => {

  const { fileId } = req.params;
  const file = await File.findById(fileId);

  if (!file) throw new NotFoundError("File doesn't exist");

  await File.findByIdAndDelete(fileId);

   return res.status(200).json(new ApiResponse(200,"upload cancelled"))
});

export {
  serveFile,
  downloadFile,
  renameFile,
  deleteFile,
  uploadInitiate,
  uploadComplete,
  cancelUpload,
};
