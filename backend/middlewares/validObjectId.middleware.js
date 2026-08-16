import mongoose from "mongoose"
import { BadRequestError } from "../utils/errors.js"

export default function validateObjectId(req,res,next,uid) {
  if(!mongoose.Types.ObjectId.isValid(uid)) {
    return next(new BadRequestError("Invalid Object Id"))
  }
  next()
}