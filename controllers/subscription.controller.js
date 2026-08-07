import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Subscription from "../models/subscription.model.js";
import razorpay from "razorpay";
import { PLANS } from "../config/plans.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import Directory from "../models/directory.model.js";

const instance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getPlans = asyncHandler(async (req, res) => {
  const plans = Object.entries(PLANS).map(([planId, details]) => ({
    planId,
    ...details,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, "Plans fetched successfully", plans));
});

const createSubscription = asyncHandler(async (req, res) => {
  const { planId } = req.body;

  console.log("Received planId:", planId);

  if (!PLANS[planId]) {
    throw new BadRequestError("Invalid plan selected");
  }

  const existingSubscription = await Subscription.findOne({
    userId: req.user._id,
  });

  if (existingSubscription) {
    throw new BadRequestError("You already have a subscription.");
  }

  const subscription = await instance.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    notes: {
      userId: req.user._id,
    },
  });

  const newSubscription = new Subscription({
    userId: req.user._id,
    subscriptionId: subscription.id,
    planId: req.body.planId,
    status: subscription.status,
  });

  await newSubscription.save();

  return res.status(201).json(
    new ApiResponse(201, "Subscription created successfully", {
      subscriptionId: subscription.id,
    }),
  );
});

const pauseSubscription = asyncHandler(async (req, res) => {
  const subscription = req.subscription;

  const response = await instance.subscriptions.pause(
    subscription.subscriptionId,
    {
      pause_at: "now",
    },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Pause request submitted successfully.", response),
    );
});

const resumeSubscription = asyncHandler(async (req, res) => {
  const subscription = req.subscription;

  const response = await instance.subscriptions.resume(
    subscription.subscriptionId,
    {
      resume_at: "now",
    },
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, " resume request submitted successfully.", response),
    );
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = req.subscription;

  const response = await instance.subscriptions.cancel(
    subscription.subscriptionId,
    {
      cancel_at_cycle_end: true,
    },
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, " cancel request submitted successfully.", response),
    );
});

const changePlan = asyncHandler(async (req, res) => {
  console.log(Object.keys(instance.subscriptions));
  const subscription = req.subscription;
  const { planId } = req.body;

  console.log("Received planId for change:", planId);

  if (!planId || !PLANS[planId]) {
    throw new BadRequestError("Invalid plan selected");
  }

  if (subscription.planId === planId) {
    throw new BadRequestError("You are already on this plan");
  }

  const currentPlan = PLANS[subscription.planId];
  const newPlan = PLANS[planId];

  if (newPlan.storageQuotaBytes < currentPlan.storageQuotaBytes) {
    const rootDirectory = await Directory.findById(req.user.rootDirId);

    if (!rootDirectory) {
      throw new NotFoundError("Root directory not found.");
    }

    if (rootDirectory.size > newPlan.storageQuotaBytes) {
      throw new BadRequestError(
        "You cannot downgrade to this plan as your current storage usage exceeds the new plan's quota.",
      );
    }
  }

  try {
    const response = await instance.subscriptions.update(
      subscription.subscriptionId,
      {
        plan_id: planId,
        schedule_change_at: "now",
      },
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Plan change requested.", response));
  } catch (error) {
    if (
      err.statusCode === 400 &&
      err.error?.code === "BAD_REQUEST_ERROR" &&
      err.error?.description ===
        "subscriptions cannot be updated when payment mode is emandate"
    ) {
      throw new BadRequestError(
        "This subscription cannot be changed. Please cancel your current subscription and create a new one.",
      );
    }
  }
});

export {
  getPlans,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  changePlan,
};
