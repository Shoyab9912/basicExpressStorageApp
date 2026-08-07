import Razorpay from "razorpay";
import asyncHandler from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/errors.js";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { PLANS } from "../config/plans.js";

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const eventId = req.headers["x-razorpay-event-id"];

  if (!eventId) {
    throw new BadRequestError("Missing webhook event id.");
  }

  const isSignatureValid = Razorpay.validateWebhookSignature(
    JSON.stringify(req.body),
    signature,
    process.env.RAZORPAY_WEBHOOK_SECRET,
  );

  if (!isSignatureValid) {
    throw new BadRequestError("Invalid webhook signature.");
  }

  const event = req.body?.event;
  const subscriptionEntity = req.body?.payload?.subscription?.entity;

  if (!subscriptionEntity) {
    return acknowledge(res);
  }

  const sub = await Subscription.findOne({
    subscriptionId: subscriptionEntity.id,
  });

  if (!sub) {
    return acknowledge(res);
  }

  if (sub.processedEventIds.includes(eventId)) {
    return acknowledge(res);
  }

  const update = {
    status: sub.status,
    $push: {
      processedEventIds: eventId,
    },
  };

  switch (event) {
    case "subscription.activated": {
      update.status = "active";
     await updateUserStorageQuota(sub.userId, subscriptionEntity.plan_id);
      break;
    }

    case "subscription.updated": {
      update.planId = subscriptionEntity.plan_id;
      await updateStorageQuota(sub.userId, subscriptionEntity.plan_id);
      break;
    }
    case "subscription.pending":
      update.status = "pending";
      break;

    case "subscription.halted":
      update.status = "halted";
      break;

    case "subscription.paused":
      update.status = "paused";
      update.pausedAt = new Date();
      break;

    case "subscription.resumed":
      update.status = "active";
      update.resumedAt = new Date();
      update.pausedAt = null;
      break;

    case "subscription.cancelled":
      update.status = "cancelled";
      update.cancelledAt = new Date();
      update.gracePeriodEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      break;

    default:
      return acknowledge(res);
  }

  await Subscription.findByIdAndUpdate(sub._id, update, {
    runValidators: true,
  });

  return acknowledge(res);
});

const updateUserStorageQuota = async (userId, planId) => {
  const plan = PLANS[planId];

  if (!plan) {
    throw new BadRequestError("Invalid user or plan.");
  }

  await User.findByIdAndUpdate(
    userId,
    {
      maxStorageInBytes: plan.storageQuotaBytes,
    },
    {
      runValidators: true,
    },
  );
};

const acknowledge = (res) => {
  return res.status(200).json(
    new ApiResponse(200, "received", {
      received: true,
    }),
  );
};

export { handleRazorpayWebhook };
