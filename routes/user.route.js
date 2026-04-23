import express from "express";
import { getNameAndEmail, login, logout, userRegister,logoutAll,getAllUsers ,adminLogout,softDeleteUser,hardDeleteUser} from "../controllers/user.controller.js";
import checkAuth,{checkRole,checkAdmin} from "../middlewares/auth.middleware.js"
import validateObjectId from "../middlewares/validObjectId.middleware.js";

const router = express.Router();

router.post('/user/register',userRegister)

router.post("/user/login",login)

router.param('userId', validateObjectId)

router.get('/user', checkAuth,getNameAndEmail)
router.get('/users', checkAuth, checkRole, getAllUsers);
router.post("/user/logout", logout);
router.post("/user/logout-all", checkAuth, logoutAll);
router.post("/users/:userId/logout", checkAuth, checkRole, adminLogout)
// router.delete("/users/:userId", checkAuth, checkAdmin, softDeleteUser)
router.delete("/users/:userId", checkAuth, checkAdmin, hardDeleteUser)
export default router;
