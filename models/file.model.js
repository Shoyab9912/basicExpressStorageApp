import { Schema, model } from "mongoose";

const fileSchema = new Schema({
  extension: {
    type: String,
    required: [true, "extension required"],
  },
  name: {
    type: String,
    required: [true, "name field required"],
  },
  parentDirId: {
    type: Schema.Types.ObjectId,
    ref: "Directory",
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
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

const File = model("File", fileSchema);
export default File;
