import { ObjectId } from "mongodb";
import User from "../models/user.model.js"
import crypto from "node:crypto"


const secretKey = ""


export default async function checkAuth(req, res, next) {
  try {
    let token = req.cookies.token;

    if (!token) {
      return res.status(400).json({ error: "invalid token" });
    }

        
    const [data, oldSignature] = token.split('.')
    //  console.log(data)
   const cookieData = Buffer.from(data,"base64url").toString()
  
    //  console.log(cookieData, oldSignature)

     const newSignature =  crypto.createHash("sha256").update(secretKey).update(cookieData).digest("base64url")
    

     if(oldSignature !== newSignature) {
        return res.clearCookie("token", {
        httpOnly: true,
        maxAge: 60 * 1000 * 60 * 24 * 7, // match login options
        // add secure/sameSite if you used them in login
      });
     }

  console.log(cookieData)
     const {id , expiry:expireTime } = JSON.parse(cookieData)
    
  
    const currentTime = Math.round(Date.now() / 1000)
 // console.log(expireTime, currentTime)

    // Reject if token is missing or not a valid ObjectId
    //  console.log(token.length)





    if (expireTime <= currentTime) {
      res.clearCookie("token", {
        httpOnly: true,
        maxAge: 60 * 1000 * 60 * 24 * 7, // match login options
        // add secure/sameSite if you used them in login
      });
    }
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "unauthorized access" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth check failed:", err);
    return res.status(500).json({ error: "internal server error" });
  }
}