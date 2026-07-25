import express from "express";
import { deleteFile, renameFile, downloadFile, uploadFile, serveFile,uploadInitiate } from "../controllers/file.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";
import validateObjectId from "../middlewares/validObjectId.middleware.js";

const router = express.Router()

router.use(checkAuth)

router.param("parentDirId", validateObjectId)
router.param('id', validateObjectId)
router.get("/:id/download", downloadFile);
router.get("/:id", serveFile);
router.route("/:id").patch(renameFile).delete(deleteFile);
router.post("/{:parentDirId}", uploadFile);
router.post("/upload/initiate",uploadInitiate)

 
export default router; 