import path from "node:path";
import { rm} from "node:fs/promises";
import { createWriteStream, } from "node:fs";
import File from "../models/file.model.js"

import { ObjectId } from "mongodb";



function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase)

  const target = path.resolve(base, part)

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new Error("invalid path")
  }

  return target
}



const serveOrDownloadFile =  async (req, res) => {
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

  const db = req.db;

  const dirCollection = db.collection("directories");
  const fileCollection = db.collection("files")

  const parentDirId = req.params.parentDirId ? new ObjectId(req.params.parentDirId) : user.rootDirId;

  if (!parentDirId) {
    return res.status(400).json({
      message: "there is no id"
    })
  }

  try {

    const dirData = await dirCollection.findOne({
      _id: parentDirId,
      userId: user._id
    })

    const fileName = req.headers.filename || "file"
    // console.log(parentDirId)

    const extension = path.extname(fileName)


    const fileData = await fileCollection.insertOne({
      extension,
      name: fileName,
      userId: user._id,
      parentDirId: dirData._id
    })

    const fileId = fileData?.insertedId.toString()
    const fullPath = `${fileId}${extension}`
    const writeStream = createWriteStream(`./storage/${fullPath}`)
    req.pipe(writeStream)
    req.on("end", () => {
      return res.status(201).json({
        message: "file uploaded successfully"
      })
    })
    req.on("error", async (err) => {
      await deleteOne({
        _id: fileData._id
      })
      next(err)
    })
  } catch (err) {
    next(err)
  }

}


const renameFile = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { newFilename } = req.body
    const db = req.db;
    const fileCollection = db.collection("files")

    const fileData = await fileCollection.findOne({
      _id: new ObjectId(id),
      userId: user._id
    })
    if (!fileData) return res.status(404).json({ message: "no such file exists" })

    await fileCollection.updateOne({
      _id: fileData._id
    }, {
      $set: {
        name: newFilename
      }
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

  const db = req.db;

  const dirCollection = db.collection("directories");
  const fileCollection = db.collection("files")

  try {
    const fileData = await fileCollection.findOne({
      _id: new ObjectId(id),
      userId: user._id
    })
    if (!fileData) return res.status(404).json({ message: "file not exists" })

   
    const filePath = safeStoragePath(req, id)
    
    await rm(`${filePath}${fileData.extension}`, { force: true });
    await fileCollection.deleteOne({
      _id:new ObjectId(id)
    })
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