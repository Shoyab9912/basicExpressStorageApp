import { ObjectId } from "mongodb"

export default function validateUid(req,res,next,uid) {
 
  if(!ObjectId.isValid(uid)) {
    return res.status(400).json({
        message:"invalid uid"
    })
  }
  next()
}