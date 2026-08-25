import Subscription from "../models/subscription.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { NotFoundError,ForbiddenError,BadRequestError } from "../utils/errors.js";

const loadSubscription = asyncHandler(async (req, res, next) => {
  req.subscription = await Subscription.findOne({
    userId: req.user._id,
  });

  next();
});

const writeAccess = asyncHandler(async (req, res, next) => {
  const subscription = req.subscription;

  if (!subscription) {
    return next();
  }

  switch (subscription.status) {
    case "created":
    case "authenticated":
    case "pending":
    case "active":
      return next();

    case "paused":
      throw new ForbiddenError(
        "Subscription is paused. Write operations are disabled.",
      );

    case "halted":
      throw new ForbiddenError(
        "Subscription is halted due to payment failure.",
      );

    case "cancelled":
      if (
        subscription.gracePeriodEndsAt &&
        subscription.gracePeriodEndsAt > new Date()
      ) {
        return next();
      }

      throw new ForbiddenError(
        "Subscription grace period has expired.",
      );

    case "expired":
      throw new ForbiddenError(
        "Subscription has expired. Please renew your plan.",
      );

    default:
      throw new ForbiddenError(
        "Write operations are not allowed for this subscription.",
      );
  }
});


const checkSubscriptionStatus = (...allowedStatuses) =>
  asyncHandler(async (req, res, next) => {
    const subscription = req.subscription;

    if (!subscription) {
      throw new NotFoundError("No active subscription found.");
    }

    if (!allowedStatuses.includes(subscription.status)) {
      throw new BadRequestError(`Subscription is ${subscription.status}.`);
    }

    next();
  });

export  { loadSubscription, writeAccess,checkSubscriptionStatus};
