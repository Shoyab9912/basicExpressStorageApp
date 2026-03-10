import express from "express";
import { getNameAndEmail, login, logout, userRegister,logoutAll } from "../controllers/user.controller.js";
import checkAuth from "../middlewares/auth.middleware.js"


const router = express.Router();

router.post('/register',userRegister)

router.post("/login",login)

router.get('/', checkAuth,getNameAndEmail)
router.post("/logout", logout);
router.post("/logout-all", checkAuth, logoutAll);
export default router;
