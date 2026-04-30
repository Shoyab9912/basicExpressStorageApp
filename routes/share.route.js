import express from "express";
import checkAuth from "../middlewares/auth.middleware.js";
import validateObjectId from "../middlewares/validObjectId.middleware.js";
import {
    getAllSharedUsers,
    revokeAccessViaEmail,
    shareViaEmail,
    updatePermission
}  from "../controllers/share.controller.js"
import getAccess from "../utils/getAccess.js";

const router =  express.Router()

router.use(checkAuth)
router.param('resourceId',validateObjectId)
router.param('userId',validateObjectId)
router.route('/:resourceType/:resourceId').post(shareViaEmail).get(getAllSharedUsers)
router.route('/:resourceType/:resourceId/:userId').post(revokeAccessViaEmail).patch(updatePermission)



export default router;