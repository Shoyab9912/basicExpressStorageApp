import express from "express";
import validateObjectId from  "../middlewares/validObjectId.middleware.js";
import checkAuth from "../middlewares/auth.middleware.js";
import {writeAccess} from "../middlewares/subscription.middleware.js"
import { createDirectory, deleteDirRecursively, getDirectory, updateDirectoryName,getBreadCrumb } from "../controllers/directory.controller.js";


const router = express.Router();

router.use(checkAuth)

router.get("/{:id}", getDirectory);
router.param('id', validateObjectId)

router.param("parentDirid", validateObjectId)
router.post('/{:parentDirId}', writeAccess, createDirectory)
router.patch('/:dirId', updateDirectoryName)
router.delete("/:id", deleteDirRecursively)
router.get("/:id/breadCrumb",getBreadCrumb)


export default router;  
