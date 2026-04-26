import express from "express";
import checkAuth from "../middlewares/auth.middleware.js";
import validateObjectId from "../middlewares/validObjectId.middleware.js";
import {
    revokeAccessViaEmail,
    shareViaEmail
}  from "../controllers/share.controller.js"

const router =  express.Router()

router.use(checkAuth)
router.param('resourceId',validateObjectId)
router.route('/:resourceType/:resourceId').post(shareViaEmail)
router.route('/:resourceType/:resourceId/:userId').post(revokeAccessViaEmail)



export default router;