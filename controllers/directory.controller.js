import { ObjectId } from "mongodb";
import { rm } from "node:fs/promises";
import Directory from "../models/directory.model.js";
import File from "../models/file.model.js"

function safeStoragePath(req, part) {
  const base = path.resolve(req.app.locals.storageBase)

  const target = path.resolve(base, part)

  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new Error("invalid path")
  }

  return target
}

const getDirectory = async (req, res, next) => {
    try {

        const user = req.user;

        if (!user) {
            return res.status(404).json({ message: "there is no user exist" })
        }

    

        const id = req.params.id ? req.params.id : user.rootDirId;

        const dirData = await Directory.findById(id)

        if (!dirData) {
            return res.status(404).json({ message: "directory doesn't exist" })
        }

    
        

        let files = await File.find({
            parentDirId: dirData._id
        })

        let directories = await Directory.find({
            parentDirId: id
        })

        return res.status(200).json({ ...dirData._doc, files: files.map(file => ({ ...file, id: file._id })), directories: directories.map(dir => ({ ...dir._doc, id: dir._id })) })
    } catch (err) {
        next(err)
    }
}


const createDirectory =  async (req, res, next) => {

  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: "there is no user exist" })
  }

 
  const parentDirId = req.params.parentDirId ? new ObjectId(req.params.parentDirId) : user.rootDirId;

  const dirName = req.headers.dirname || "newFolder"

  
  try {
    
    const parentDir = await Directory.findOne({
      _id: parentDirId,
      userId:user._id
    })


    if (!parentDir) return res.status(404).json({ message: "There is  no such directory exists" })

   const createDir =  await Directory.create({
      userId: user._id,
      name: dirName,
      parentDirId 
    })
  console.log(createDir)
    return res.status(201).json({
      message: "successfully created dir"
    })

  } catch (error) {
    console.log(error.errInfo.details.schemaRulesNotSatisfied)
    next(error)
    
  } 
}


const updateDirectoryName =  async (req, res, next) => {
  const { dirId } = req.params;
  const { newDirName } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: "no user found" })
  }

  const db = req.db;

  const dirCollection = db.collection("directories");


  try {
    const dirData = await dirCollection.findOne({
      _id: new ObjectId(dirId)
    })
    if (!dirData) return res.status(404).json({ message: "there is no directory  exists" })

    await dirCollection.updateOne({
      _id: new ObjectId(dirId),
      userId: user._id
    }, {
      $set: {
        name: newDirName
      }
    })

    return res.status(201).json({
      message: "dir rename successfull"
    })
  } catch (err) {
    next(err)
  }
}


const deleteDirRecursively =  async (req, res, next) => {
  try {
    const user = req.user
    const { id } = req.params;
    const db = req.db;

    const dirCollection = db.collection("directories");
    let fileCollection = db.collection("files")
    const dirData = await dirCollection.findOne({
      _id: new ObjectId(id),
      userId: user._id
    })

    if (!dirData) {
      return res.status(404).json({ message: "no such  dir exists" })
    }

    async function getDirRecursively(id) {
      try {

        let files = await fileCollection.find({
          parentDirId: id
        }, {
          projection: {
            extension: 1
          }
        }).toArray()
        let directories = await dirCollection.find({
          parentDirId: id
        }, {
          projection: {
            _id: 1
          }
        }).toArray()

        // console.log(directories)

        for (let { _id } of directories) {
          const { files: childFiles, directories: childDirs } = await getDirRecursively(_id)

          files = [...files, ...childFiles]
          directories = [...directories, ...childDirs]
        }

        return { files, directories }
      } catch (error) {
        console.log("getting files and directory failed")
      }


    }

    const { files, directories } = await getDirRecursively(dirData._id);

    for (let { _id, extension } of files) {
      await rm(`./storage/${_id.toString()}${extension}`, { force: true });
    }

     await fileCollection.deleteMany({
      _id: {
        $in: [...files.map(f => f._id)]
      }
    })

     await dirCollection.deleteMany({
      _id: {
        $in: [...directories.map(dir => dir._id), dirData._id]
      }
    })



    return res.status(200).json({
      message: "successfully removed",
    });


  } catch (error) {
    next(error)
  }
}




export {
    createDirectory,
    getDirectory,
    deleteDirRecursively,
    updateDirectoryName
}