import express from "express";
import validateObjectId from  "../middlewares/validObjectId.middleware.js";
import checkAuth from "../middlewares/auth.middleware.js";
import {loadSubscription,writeAccess} from "../middlewares/subscription.middleware.js"
import { createDirectory, deleteDirRecursively, getDirectory, updateDirectoryName,getBreadCrumb } from "../controllers/directory.controller.js";


const router = express.Router();

router.use(checkAuth)

router.get("/{:id}", getDirectory);
router.param('id', validateObjectId)

router.param("parentDirId", validateObjectId)
router.post('/{:parentDirId}',loadSubscription, writeAccess, createDirectory)
router.patch('/:dirId', updateDirectoryName)
router.delete("/:id", deleteDirRecursively)
router.get("/:id/breadCrumb",getBreadCrumb)


export default router;  
