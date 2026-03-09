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
    expires: 60 * 60 * 24 // Session expires after 24 hours
  }
});

const Session = mongoose.model("Session", sessionSchema)

export default Session;