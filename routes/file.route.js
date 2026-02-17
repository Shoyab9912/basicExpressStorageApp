import express from "express";
import { deleteFile, renameFile, serveOrDownloadFile, uploadFile } from "../controllers/file.controller.js";

import validateUid from "../middlewares/validId.js";

const router = express.Router()



router.get("/:id",serveOrDownloadFile);

router.param("parentDirId", validateUid)

router.post("/{:parentDirId}", uploadFile);

router.patch("/:id",renameFile );

router.delete("/:id",deleteFile);

router.param("id", validateUid)

export default router; 