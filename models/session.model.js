import mongoose,{Schema} from "mongoose";

const sessionSchema = new Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt : {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 3// Session expires after 24 hours
  }
});

const Session = mongoose.model("Session", sessionSchema)

export default Session;

// 69ef58d1a2a88d27908b32fb sid   69e746152b11be265f72f09b   69ef5958704a676cfc3c095f