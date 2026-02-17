import express from "express";

import validateUid from "../middlewares/validId.js";

import { createDirectory, deleteDirRecursively, getDirectory, updateDirectoryName } from "../controllers/directory.controller.js";

const router = express.Router();

router.get("/{:id}", getDirectory);
router.param('id', validateUid)



router.param("parentDirid", validateUid)
router.post('/{:parentDirId}', createDirectory)


router.patch('/:dirId', updateDirectoryName)

router.param("id", validateUid)

router.delete("/:id", deleteDirRecursively)


export default router;  
