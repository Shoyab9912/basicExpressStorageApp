import express from "express";
import {
  adminLogoutAll,
  getAllUsers,
  adminLogout,
  hardDeleteUser,
  changeRole,
  viewDirectories,
  viewFiles,
  viewSingleFile,
  deleteFile,
} from "../controllers/admin.controller.js";
import checkAuth, {
  checkRole,
} from "../middlewares/auth.middleware.js";
import validateObjectId from "../middlewares/validObjectId.middleware.js";
import { ROLES } from "../constants/roles.js";
const router = express.Router();


router.use(checkAuth);

router.get(
  "/users",
  checkRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.OWNER),
  getAllUsers,
);



router.post("/user/logout-all",checkRole( ROLES.ADMIN, ROLES.OWNER), adminLogoutAll);


router.get(
  "/users/:userId/files",
  checkRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.OWNER),
  viewFiles,
);

router.get(
  "/users/:userId/directories",
  checkRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.OWNER),
  viewDirectories,
);

router.get(
  "/files/:fileId",
  checkRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.OWNER),
  viewSingleFile,
);

router.post(
  "/users/:userId/logout",
  checkRole(ROLES.ADMIN, ROLES.OWNER),
  adminLogout,
);

router.patch(
  "/users/:userId/role",
  checkRole(ROLES.ADMIN, ROLES.OWNER),
  changeRole,
);

router.delete(
  "/users/:userId/hard",
  checkRole(ROLES.ADMIN, ROLES.OWNER),
  hardDeleteUser,
);

router.delete(
  "/users/:userId/files/:fileId",
  checkRole(ROLES.OWNER),
  deleteFile,
);


export default router;