import express from "express";
import {
  userRegister,
  login,
  logout,
  getNameAndEmail,
  softDeleteUser,
} from "../controllers/user.controller.js";
import validateObjectId from "../middlewares/validObjectId.middleware.js";
import checkAuth from "../middlewares/auth.middleware.js";
const router = express.Router();

// Public routes
router.post("/register", userRegister);
router.post("/login", login);

router.param("userId", validateObjectId);

// Everything below requires authentication
router.use(checkAuth);

router.get("/me", getNameAndEmail);
router.post("/logout", logout);


router.delete(
  "/users/:userId", 
  softDeleteUser
);

export default router;