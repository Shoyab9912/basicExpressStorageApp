import express from "express";
import { getNameAndEmail, login, logout, userRegister,logoutAll,getAllUsers ,adminLogout} from "../controllers/user.controller.js";
import checkAuth,{checkRole} from "../middlewares/auth.middleware.js"


const router = express.Router();

router.post('/user/register',userRegister)

router.post("/user/login",login)

router.get('/user', checkAuth,getNameAndEmail)
router.get('/users', checkAuth, checkRole, getAllUsers);
router.post("/user/logout", logout);
router.post("/user/logout-all", checkAuth, logoutAll);
router.post("/users/:userId/logout", checkAuth, checkRole, adminLogout)
export default router;
