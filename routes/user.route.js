import express from "express";
import { getNameAndEmail, login, logout, userRegister, logoutAll, getAllUsers, adminLogout, softDeleteUser, hardDeleteUser, changeRole,viewDirectories,viewFiles,viewSingleFile,deleteFile} from "../controllers/user.controller.js";
import checkAuth, { checkRole, checkAdmin,checkOwner } from "../middlewares/auth.middleware.js"
import validateObjectId from "../middlewares/validObjectId.middleware.js";

const router = express.Router();

router.post('/user/register', userRegister)

router.post("/user/login", login)

router.param('userId', validateObjectId)

router.get('/user', checkAuth, getNameAndEmail)
router.get('/users', checkAuth, checkRole, getAllUsers);
router.post("/user/logout", logout);
router.post("/user/logout-all", checkAuth, logoutAll);
router.post("/users/:userId/logout", checkAuth, checkRole, adminLogout)
router.delete("/users/:userId", checkAuth, checkAdmin, softDeleteUser)
router.delete("/users/:userId/hard", checkAuth, checkAdmin, hardDeleteUser)
router.patch("/users/:userId/role", checkAuth, checkAdmin, changeRole)
router.get("/users/:userId/files", checkAuth, checkAdmin, viewFiles)
router.get("/users/:userId/directories", checkAuth, checkAdmin, viewDirectories)
router.get("/users/:userId/files/:fileId", checkAuth, checkAdmin, viewSingleFile)
router.delete("/users/:userId/files/:fileId", checkAuth, checkOwner,deleteFile)
export default router;
