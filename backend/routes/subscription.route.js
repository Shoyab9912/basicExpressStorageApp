import express from "express";
import checkAuth from "../middlewares/auth.middleware.js";
import {
  createSubscription,
  getPlans,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  changePlan
} from "../controllers/subscription.controller.js";
import {loadSubscription,checkSubscriptionStatus} from "../middlewares/subscription.middleware.js"

const router = express.Router();
router.get("/plans", getPlans);

router.use(checkAuth);

router.post("/", createSubscription);
router.post(
  "/pause",
  loadSubscription,
  checkSubscriptionStatus("active"),
  pauseSubscription,
);
router.post(
  "/resume",
  loadSubscription,
  checkSubscriptionStatus("paused"),
  resumeSubscription,
);
router.post(
  "/cancel",
  loadSubscription,
  checkSubscriptionStatus("active", "paused"),
  cancelSubscription,
);

router.post(
  "/change-plan",
  loadSubscription,
  checkSubscriptionStatus("active"),
  changePlan
);


export default router;
