import path from "node:path";
import { rm } from "node:fs/promises";
import { createWriteStream, } from "node:fs";
import File from "../models/file.model.js"
import Directory from "../models/directory.model.js";

import { ObjectId } from "mongodb";



function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase)

  const target = path.resolve(base, part)

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new Error("invalid path")
  }

  return target
}



const serveOrDownloadFile = async (req, res) => {
  const { id } = req.params;

  const user = req.user;



  const file = await File.findOne({
    _id: id,
    userId: user._id
  })

  if (!file) return res.status(404).json({ message: "no such file exists" })

  const filePath = safeStoragePath(req, id)

  if (req.query.action === "download") {
    return res.download(`${filePath}${file.extension}`, file.name)
  }

  return res.sendFile(`${filePath}${file.extension}`, (err) => {
    if (!res.headersSent && err) {
      return res.status(404).json({
        message: "File not found",
      });
    }
  });
}



const uploadFile = async (req, res, next) => {
  const user = req.user;



  const parentDirId = req.params.parentDirId ?? user.rootDirId;

  if (!parentDirId) {
    return res.status(400).json({
      message: "id doesn't exist"
    })
  }

  try {

    const dirData = await Directory.findOne({
      _id: parentDirId,
      userId: user._id
    })

    const fileName = req.headers.filename || "file"
    // console.log(parentDirId)

    const extension = path.extname(fileName)

    const fileData = await File.insertOne({
      extension,
      name: fileName,
      userId: user._id,
      parentDirId: dirData._id
    })
   console.log(fileData)
    const fileId = fileData.id
    const fullPath = `${fileId}${extension}`
    const writeStream = createWriteStream(`./storage/${fullPath}`)
    req.pipe(writeStream)
    req.on("end", () => {
      return res.status(201).json({
        message: "file uploaded successfully"
      })
    })
    req.on("error", async (err) => {
      const filePath = safeStoragePath(req, fileId)
      await rm(`${filePath}${fileData.extension}`, { force: true });

      await File.findByIdAndDelete(fileData.id)
      next(err)
    })
  } catch (err) {
    console.error("error", err.message)
    next(err)
  }

}


const renameFile = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { newFilename } = req.body

    if (!newFilename || !newFilename.trim()) {
      return res.status(400).json({
        message: "Invalid filename"
      });
    }


    await File.findOneAndUpdate({
      _id: id,
      userId: user._id
    }, {
      $set: {
        name: newFilename
      }
    }, {
      returnDocument: "after"
    })

    return res.status(200).json({
      message: "file renamed successfully",
    });
  } catch (error) {
    next(error)
  }
}



const deleteFile = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;


  try {

    const file = await File.findOne({
      _id: id,
      userId: user._id
    }).select(' extension ')

    if (!file) {
      return res.status(404).json({
        message: "file doesn't exists"
      })
    }

    const filePath = safeStoragePath(req, id)
    await file.deleteOne()
    await rm(`${filePath}${file.extension}`, { force: true });

    return res.status(204).json({
      message: "successfully removed",
    });
  } catch (error) {
    next(error)
  }
}


export {
  serveOrDownloadFile,
  uploadFile,
  renameFile,
  deleteFile
}