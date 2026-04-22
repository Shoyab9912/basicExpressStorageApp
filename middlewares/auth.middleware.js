
import User from "../models/user.model.js"
import Session from "../models/session.model.js";


export default async function checkAuth(req, res, next) {
  console.log("Checking auth for request:", req.method, req.originalUrl);
  try {
    let sid = req.signedCookies.sessionId;
     
    if (!sid) {
      return res.status(400).json({ error: "invalid session ID" });
    }

        
     const session = await Session.findById(sid);

     if (!session) {
      return res.status(401).json({ error: "unauthorized access" });
    }
    
  
    const user = await User.findById(session.userId).select("-password");

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


export function checkRole(req,res,next) {

   if(req.user.role === "User") {
    return res.status(403).json({error:"forbidden access"})
   }
   next();
}


export function checkAdmin(req,res,next) {
   if(req.user.role !== "Admin" || req.user.role !== "Owner") {
    return res.status(403).json({error:"forbidden access"})
   }
   next();
}