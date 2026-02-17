import express from "express";
import { getNameAndEmail, login, logout, registerUser } from "../controllers/user.controller.js";
import checkAuth from "../middlewares/auth.js"


const router = express.Router();

router.post('/register',registerUser)

router.post("/login",login)

router.get('/', checkAuth,getNameAndEmail)
router.post("/logout", logout);

export default router;
