import { model, Schema, trusted } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["created", "active", "pending", "halted", "paused", "cancelled","expired"],
      default: "created",
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    resumedAt: {
      type: Date,
      default: null,
    },
    gracePeriodEndsAt: {
      type: Date,
      default: null,
    },
    processedEventIds: {
      type: [String],
      default: [],
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Subscription = model("Subscription", subscriptionSchema);

export default Subscription;
