import express from "express";
import path from "node:path";
import { writeFile, rm } from "node:fs/promises";

import directoryData from "../directoriesDB.json" with {type: "json"}

import fileData from "../fileDB.json" with {type: "json"}


const router = express.Router();



router.get("/", handler);
router.get("/:id", handler);

async function handler(req, res) {
  try {
    const { id } = req.params;
    let dirData;

    if (!id) {
      dirData = directoryData[0]
    } else {
      dirData = directoryData.find(dirId => dirId.id === id)
    }

    if (!dirData) {
      return res.status(404).json({ message: "three are no directories" })
    }

    const files = dirData.files.map(fileId => fileData.find(fs => fs.id === fileId)).filter(Boolean)
    console.log(files)
    const directories = dirData.directories.map(dirId => directoryData.find(dir => dir.id === dirId)).filter(Boolean).map(({ id, name }) => ({ id, name }))
    console.log(directories)
    return res.status(201).json({ ...dirData, files, directories })
  } catch (err) {
    return res.status(404).json({
      message: err.message || "op failed"
    })
  }
}

router.post("/", handlePost);
router.post('/:parentDirId', handlePost)

async function handlePost(req, res) {
  const parentDirId = req.params.parentDirId || directoryData[0].id;
  const dirName = req.headers.dirname
  const parentDir = directoryData.find(dir => dir.id === parentDirId)
  const id = crypto.randomUUID()
  parentDir.directories.push(id)
  directoryData.push({
    id,
    name: dirName,
    parentDirId,
    files: [],
    directories: []
  })

  try {
    await writeFile("./directoriesDB.json", JSON.stringify(directoryData))
    return res.status(200).json({
      message: "successfully folder created",
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "server side error",
    });
  }
}

router.patch('/:dirId', async (req, res) => {
  const { dirId } = req.params;
  const { newDirName } = req.body;
  const dirData = directoryData.find(dir => dir.id === dirId)
  dirData.name = newDirName || dirData.name
  try {
    await writeFile('./directoriesDB.json', JSON.stringify(directoryData))
    return res.status(201).json({
      message: "dir rename successfull"
    })
  } catch (err) {
    return res.status(404).json({
      message: err.message || "patch update failed"
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    console.log(req.params)
    const { id } = req.params;
    const dirIndex = directoryData.findIndex((dir) => dir.id === id)
    if (dirIndex === -1) {
      return res.status(404).json({ message: "Directory not found" });
    }

    const dirData = directoryData[dirIndex];

    for await (let file of dirData.files) {
      let fileIndex = fileData.findIndex(fileId => fileId.id === file);
      if (fileIndex !== -1) {
        let fileD = fileData[fileIndex];
        await rm(`./storage/${fileD.id}${fileD.extension}`, { force: true })
        fileData.splice(fileIndex, 1)
      }
    }

    //  console.log("worl=king")
    for await (let directory of dirData.directories) {
      const dirIndex = directoryData.findIndex(dir => dir.id === directory)
      directoryData.splice(dirIndex, 1)
    }
    directoryData.splice(dirIndex, 1)
    const parentDir = directoryData.find(dir => dir.id === dirData.parentDirId)
    
    if (parentDir) {
      parentDir.directories = parentDir.directories.filter(dirId => dirId !== id)
    }

    await writeFile("./fileDB.json", JSON.stringify(fileData))
    await writeFile('./directoriesDB.json', JSON.stringify(directoryData))


    return res.status(200).json({
      message: "successfully removed",
    });
  } catch (err) {
    return res.status(404).json({
      message: err.message || "not removerd"
    })
  }


})

export default router;  