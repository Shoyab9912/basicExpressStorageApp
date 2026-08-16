import mongoose from "mongoose";
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

  const subscriptionEntity =
    req.body?.payload?.subscription?.entity;

  if (!subscriptionEntity) {
    return acknowledge(res);
  }

  const sub = await Subscription.findOne({
    subscriptionId: subscriptionEntity.id,
  });

  if (!sub) {
    return acknowledge(res);
  }

  // Fast duplicate check.
  if (sub.processedEventIds.includes(eventId)) {
    return acknowledge(res);
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    let update;

    switch (event) {
      case "subscription.authenticated": {
        update = {
          status: "authenticated",
        };
        break;
      }

      case "subscription.activated": {
        update = {
          status: "active",
        };

        await updateUserStorageQuota(
          sub.userId,
          subscriptionEntity.plan_id,
          session,
        );

        break;
      }

      case "subscription.charged": {
        update = {
          status: "active",
          lastChargedAt: new Date(),
        };

        await updateUserStorageQuota(
          sub.userId,
          subscriptionEntity.plan_id,
          session,
        );

        break;
      }

      case "subscription.updated": {
        update = {
          planId: subscriptionEntity.plan_id,
        };

        await updateUserStorageQuota(
          sub.userId,
          subscriptionEntity.plan_id,
          session,
        );

        break;
      }

      case "subscription.pending": {
        update = {
          status: "pending",
        };
        break;
      }

      case "subscription.halted": {
        update = {
          status: "halted",
        };
        break;
      }

      case "subscription.paused": {
        update = {
          status: "paused",
          pausedAt: new Date(),
        };
        break;
      }

      case "subscription.resumed": {
        update = {
          status: "active",
          resumedAt: new Date(),
          pausedAt: null,
        };
        break;
      }

      case "subscription.cancelled": {
        update = {
          status: "cancelled",
          cancelledAt: new Date(),
          gracePeriodEndsAt: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ),
        };
        break;
      }

      default: {
        await session.abortTransaction();
        return acknowledge(res);
      }
    }

    /*
     * Atomic idempotency protection.
     *
     * Even if two identical webhook requests arrive
     * simultaneously, only one can add this eventId.
     */
    const updatedSubscription =
      await Subscription.findOneAndUpdate(
        {
          _id: sub._id,
          processedEventIds: { $ne: eventId },
        },
        {
          ...update,
          $push: {
            processedEventIds: eventId,
          },
        },
        {
          session,
          runValidators: true,
        },
      );

    /*
     * Another request may have processed the same event
     * while this request was running.
     */
    if (!updatedSubscription) {
      await session.abortTransaction();
      return acknowledge(res);
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  return acknowledge(res);
});

const updateUserStorageQuota = async (
  userId,
  planId,
  session,
) => {
  const plan = PLANS[planId];

  if (!plan) {
    throw new BadRequestError("Invalid plan.");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      maxStorageInBytes: plan.storageQuotaBytes,
    },
    {
      runValidators: true,
      session,
    },
  );

  if (!user) {
    throw new BadRequestError("User not found.");
  }
};

const acknowledge = (res) => {
  return res.status(200).json(
    new ApiResponse(200, "received", {
      received: true,
    }),
  );
};

export { handleRazorpayWebhook };