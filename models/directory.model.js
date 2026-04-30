import { Schema, model } from "mongoose";
import { permission } from "node:process";

const directorySchema = new Schema({
  name: {
    type: String,
    required: [true, "name field required"],
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  parentDirId: {
    type: Schema.Types.ObjectId,
    ref: "Directory",
    default: null,
  },
  sharedWith: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      permission: { type: String, enum: ["viewer", "editor"] },
    },
  ],
  shareLink: {
    token: { type: String, default: null },
    permission: { type: String, enum: ["viewer", "editor"] },
    expiresAt: { type: Date, default: null },
  },
});

const Directory = model("Directory", directorySchema);

export default Directory;
