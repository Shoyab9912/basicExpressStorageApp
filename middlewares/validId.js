export default function validateUid(req,res,next,uid) {
 const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(!uuidRegex.test(uid)) {
    return res.status(400).json({
        message:"invalid uid"
    })
  }
  next()
}