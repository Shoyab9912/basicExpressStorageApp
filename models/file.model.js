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
  size : {
   type : Number,
   required : [true, "size field required"],
  },
  parentDirId: {
    type: Schema.Types.ObjectId,
    ref: "Directory",
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  isUploading: {
    type:Boolean,
    required:true,
    default:false
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
fileSchema.index({ parentDirId: 1 ,userId: 1});
const File = model("File", fileSchema);

export default File;
