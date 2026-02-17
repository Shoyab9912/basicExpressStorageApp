import { ObjectId } from "mongodb";
import { rm } from "node:fs/promises";
import Directory from "../models/directory.model.js";
import File from "../models/file.model.js"

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


const createDirectory = async (req, res, next) => {

  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: "there is no user exist" })
  }


  const parentDirId = req.params.parentDirId ? new ObjectId(req.params.parentDirId) : user.rootDirId;

  const dirName = req.headers.dirname || "newFolder"


  try {

    const parentDir = await Directory.findOne({
      _id: parentDirId,
      userId: user._id
    })


    if (!parentDir) return res.status(404).json({ message: "There is  no such directory exists" })

    const createDir = await Directory.create({
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


const updateDirectoryName = async (req, res, next) => {
  const { dirId } = req.params;
  const { newDirName } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: "no user found" })
  }

  try {
    const dirData = await Directory.findOneAndUpdate({
      _id: dirId,
      userId: user._id
    }, {
      $set: {
        name: newDirName
      }
    }, {
      returnDocument: "after"
    })

    return res.status(201).json({
      message: "dir rename successfull",
      data: dirData
    })
  } catch (err) {
    next(err)
  }
}


const deleteDirRecursively = async (req, res, next) => {
  try {
    const user = req.user
    const { id } = req.params;
    
    const dirData = await Directory.findOne({
      _id: id,
      userId: user._id
    })

    if (!dirData) {
      return res.status(404).json({ message: "no such  dir exists" })
    }

    async function getDirRecursively(id) {
      try {

        let files = await File.find({
          parentDirId: id
        }, {
          extension: 1
        }
        ).lean()
      
        let directories = await Directory.find({
          parentDirId: id
        }, {
          _id: 1
         
        }).lean()

      
        // console.log(directories)

        const currentDirectories = [...directories]
        
        for (let { _id } of currentDirectories) {
          const { files: childFiles, directories: childDirs } = await getDirRecursively(_id)

          files.push(...childFiles)
          directories.push(...childDirs)
        }

        return { files , directories }
      } catch (error) {
        console.log("getting files and directory failed",error.message)
        return {files:[],directories:[]}
      }
    }

    const { files, directories } = await getDirRecursively(dirData._id);
    console.log(files,directories)
  
   if(files.length !== 0){
     con
    for (let { _id, extension } of files) {
      await rm(`./storage/${_id.toString()}${extension}`, { force: true });
    }

    await File.deleteMany({
      _id: {
        $in: [...files.map(f => f._id)]
      }
    })
  }

  if(directories.length !== 0) {
    await Directory.deleteMany({
      _id: {
        $in: [...directories.map(dir => dir._id), dirData._id]
      }
    })

  }

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