import express from "express";
import { deleteFile, renameFile, serveOrDownloadFile, uploadFile } from "../controllers/file.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";
import validateObjectId from  "../middlewares/validObjectId.middleware.js";

const router = express.Router()

router.use(checkAuth)

router.param("parentDirId", validateObjectId)
router.param('id', validateObjectId)

router.get("/:id", serveOrDownloadFile);
router.post("/{:parentDirId}", uploadFile);
router.patch("/:id", renameFile);
router.delete("/:id", deleteFile);


export default router; 