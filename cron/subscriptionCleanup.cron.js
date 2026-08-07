import cron from "node-cron";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import { FREE_STORAGE_BYTES } from "../config/plans.js";

cron.schedule("0 2 * * *", async () => {
  console.log("Running subscription cleanup task...");
  try {
    const subscriptions = await Subscription.find(
      {
        status: "cancelled",
        gracePeriodEndsAt: { $lte: new Date() },
      },
      "userId",
    );


    if (subscriptions.length === 0) {
      console.log("No expired subscriptions found.");
      return;
    }

    const userIds = subscriptions.map((sub) => sub.userId);

    const userUpdated = await User.updateMany(
      {
        _id: { $in: userIds },
      },
      {
        $set: {
          maxStorageInBytes: FREE_STORAGE_BYTES,
        },
      },
    );

    const subscriptionIds = subscriptions.map((sub) => sub._id);

    const subscriptionUpdated = await Subscription.updateMany(
      {
        _id: { $in: subscriptionIds },
      },
      {
        $set: {
          status: "expired",
        },
      },
    );

    console.log(
      "Subscription cleanup completed successfully",
      subscriptionUpdated,
      userUpdated,
    );
  } catch (error) {
    console.error("Error during subscription cleanup:", error);
  }
});
