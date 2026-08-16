import express from "express";
import { deleteFile, renameFile, downloadFile, serveFile,uploadInitiate,cancelUpload,uploadComplete } from "../controllers/file.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";
import {loadSubscription,writeAccess} from "../middlewares/subscription.middleware.js"
import validateObjectId from "../middlewares/validObjectId.middleware.js";

const router = express.Router()

router.use(checkAuth)

router.param("parentDirId", validateObjectId)
router.param('id', validateObjectId)
router.get("/:id/download", downloadFile);
router.get("/:id", serveFile);
router.route("/:id").patch(renameFile).delete(deleteFile);
router.post("/upload/initiate",loadSubscription,writeAccess,uploadInitiate)
router.post("/upload/complete",loadSubscription,writeAccess,uploadComplete)
router.delete("/cancel/:fileId",loadSubscription,writeAccess,cancelUpload)
export default router; 