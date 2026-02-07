import express from "express";

import { writeFile, rm } from "node:fs/promises";
import validateUid from "../middlewares/validId.js";

import directoryData from "../directoriesDB.json" with {type: "json"}

import fileData from "../fileDB.json" with {type: "json"}
import crypto from "node:crypto"
import { ObjectId } from "mongodb";

const router = express.Router();



router.get("/{:id}", async (req,res) => {
  try {
 
     const user = req.user;

    if (!user) {
      return res.status(404).json({ message: "no user found" })
    }

    const db = req.db;

    const dirCollection = db.collection("directories");
  
    const id = req.params.id ?? user.parentDirId;
  
    const dirData = await dirCollection.findOne({
      _id:new ObjectId(id)
    })

     if (!dirData) {
      return res.status(404).json({ message: "three are no directories" })
    }

    let files = [];
    let directories = [];

   return res.status(200).json({ ...dirData, files, directories })
  } catch (err) {
    return res.status(404).json({
      message: "No files or directory exists"
    })
  }
});
router.param('id',validateUid)



router.param("parentDirid",validateUid)
router.post('/{:parentDirId}', handlePost)

async function handlePost(req, res, next) {
  const user = req.user

  const parentDirId = req.params.parentDirId ?? user.rootDirId;
  const dirName = req.headers.dirname || "newFolder"
  const parentDir = directoryData.find(dir => dir.id === parentDirId)
  if (!parentDir) return res.status(404).json({ message: "There is no directory exists" })
  const id = crypto.randomUUID()
  parentDir.directories.push(id)
  directoryData.push({
    id,
    userId: user.id,
    name: dirName,
    parentDirId,
    files: [],
    directories: []
  })

  try {
    await writeFile("./directoriesDB.json", JSON.stringify(directoryData))
    return res.status(201).json({
      message: "successfully folder created",
    });
  } catch (err) {
    next(err)
  }
}

router.patch('/:dirId', async (req, res, next) => {
  const { dirId } = req.params;
  const { newDirName } = req.body;
  const dirData = directoryData.find(dir => dir.id === dirId)
  if (!dirData) return res.status(404).json({ message: "there is no directory  exists" })
  dirData.name = newDirName || dirData.name
  try {
    await writeFile('./directoriesDB.json', JSON.stringify(directoryData))
    return res.status(201).json({
      message: "dir rename successfull"
    })
  } catch (err) {
    next(err)
  }
})

router.param("id",validateUid)

router.delete("/:id", async (req, res, next) => {
  try {
    const user = req.user
    const { id } = req.params;
    const dirData = directoryData.some(dir => dir.id === id && dir.userId === user.id)

    if (!dirData) {
      return res.status(404).json({ message: "no dir exists" })
    }

    await deleteDirRecursively(id, directoryData, fileData);

    await writeFile("./fileDB.json", JSON.stringify(fileData))
    await writeFile('./directoriesDB.json', JSON.stringify(directoryData))


    return res.status(200).json({
      message: "successfully removed",
    });


  } catch (error) {
    next(error)
  }
})


async function deleteDirRecursively(dirId, directoryData, fileData) {

  const dirIndex = directoryData.findIndex(dir => dir.id === dirId);

  if (dirIndex === -1) return;

  const dirData = directoryData[dirIndex];

  for (let childDirId of dirData.directories || []) {
    await deleteDirRecursively(childDirId, directoryData, fileData)
  }



  for (let fileId of dirData.files || []) {

    let fileIndex = fileData.findIndex(f => f.id === fileId);

    if (fileIndex !== -1) continue;
    let data = fileData[fileIndex];
    if (!data) continue;
    await rm(`./storage/${data.id}${data.extension}`, { force: true });
    fileData.splice(fileIndex, 1)

  }

  const parentDir = directoryData.find(dir => dir.id === dirData.parentDirId)
  if (parentDir) {
    parentDir.directories = (parentDir.directories || []).filter(childId => childId !== dirId)
  }

  const index = directoryData.findIndex(dir => dir.id === dirId)
  if (index !== -1) {
    directoryData.splice(index, 1)
  }


}

/*
router.delete('/:id', async (req, res, next) => {
  try {

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
    next(err)
  }


})
*/
export default router;  