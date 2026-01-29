import express from "express";
import path from "node:path";
import { rename, rm, writeFile } from "node:fs/promises";
import { createWriteStream, } from "node:fs";
import directoryData from "../directoriesDB.json" with {type: "json"}

import fileData from "../fileDB.json" with {type: "json"}

const router = express.Router()



function safeStoragePath(req, ...parts) {
  const base = path.resolve(req.app.locals.storageBase)
  console.log(base, ...parts)
  const target = path.resolve(base, ...parts)
  console.log(base)
  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new Error("invalid path")
  }

  return target
}

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const file = fileData.find(fileId => fileId.id === id)
  if (!file) return res.status(404).json({ message: "no such file exists" })
  if (req.query.action === "download") {
    res.set("Content-Disposition", `attachment; filename = ${file.name}`);
  }
  let parts = [];
  if (typeof id === "string") {
    parts = id.split()
  }

  const filePath = safeStoragePath(req, ...parts)
  return res.sendFile(`${filePath}${file.extension}`, (err) => {
    if (!res.headersSent && err) {
      return res.status(404).json({
        message: "File not found",
      });
    }
  });
});


router.post("/", handler);              // no parentDirId
router.post("/:parentDirId", handler);  // with parentDirId

function handler(req, res, next) {
  const parentDirId = req.params.parentDirId || directoryData[0].id
  const filename = req.headers.filename


  const id = crypto.randomUUID();
  const extension = path.extname(filename)
  const fullPath = `${id}${extension}`

  const writeStream = createWriteStream(`./storage/${fullPath}`);

  req.pipe(writeStream);

  writeStream.on("error", (err) => {
    next(err)
  });

  req.on("error", (err) => {
    next(err)

  });

  req.on("end", async () => {

    fileData.push({
      id,
      extension,
      name: filename,
      parentDirId
    })
    const dirData = directoryData.find(dirId => dirId.id === parentDirId)

    dirData.files.push(id)

    try {
      await writeFile("./fileDB.json", JSON.stringify(fileData))
      await writeFile('./directoriesDB.json', JSON.stringify(directoryData))

      return res.status(201).json({
        message: "successfully uploaded",
      });
    } catch (error) {
      next(err)
    }


  })

}

router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const findData = fileData.find(data => data.id === id)
    if (!findData) return res.status(404).json({ message: "no such file exists" })
    findData.name = req.body.newFilename;
    await writeFile("./fileDB.json", JSON.stringify(fileData))

    return res.status(200).json({
      message: "file renamed successfully",
    });
  } catch (error) {
    next(error)
  }
});

router.delete("/:id", async (req, res, next) => {


  const { id } = req.params;
  const fileIndex = fileData.findIndex(data => data.id === id)
  if (fileIndex === -1) return res.status(404).json({ message: "file not exists" })
  const findData = fileData[fileIndex]
  const dirData = directoryData.find(dirId => dirId.id === findData.parentDirId)
  if (!dirData) return res.status(404).json({ message: "no directory exists" })
  let parts = [];
  if (typeof id === "string") {
    parts = id.split()
  }

  const filePath = safeStoragePath(req, ...parts)
  try {
    await rm(`${filePath}${findData.extension}`, { recursive: true });

    fileData.splice(fileIndex, 1)
    dirData.files = dirData.files.filter(dirId => dirId !== id)

    await writeFile("./fileDB.json", JSON.stringify(fileData))
    await writeFile('./directoriesDB.json', JSON.stringify(directoryData))


    return res.status(204).json({
      message: "successfully removed",
    });
  } catch (error) {
    next(error)
  }
});



export default router;