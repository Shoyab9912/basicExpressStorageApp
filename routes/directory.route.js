import express from "express";
import validateObjectId from  "../middlewares/validObjectId.middleware.js";
import checkAuth from "../middlewares/auth.middleware.js";
import { createDirectory, deleteDirRecursively, getDirectory, updateDirectoryName } from "../controllers/directory.controller.js";


const router = express.Router();

router.use(checkAuth)

router.get("/{:id}", getDirectory);
router.param('id', validateObjectId)



router.param("parentDirid", validateObjectId)
router.post('/{:parentDirId}', createDirectory)


router.patch('/:dirId', updateDirectoryName)

router.param("id", validateObjectId)

router.delete("/:id", deleteDirRecursively)


export default router;  
