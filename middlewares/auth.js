
import User from "../models/user.model.js"



export default async function checkAuth(req, res, next) {
  try {
    let token = req.signedCookies.token;
     console.log(req.signedCookies)
    if (!token) {
      return res.status(400).json({ error: "invalid token" });
    }

        
     const {id , expiry:expireTime } = JSON.parse(token)
    
  
    const currentTime = Math.round(Date.now() / 1000)

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