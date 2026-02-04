import userData from "../userDB.json" with {type: "json"}



export default function checkAuth(req, res, next) {
    const { uid } = req.cookies;
   const user = userData.find(u => u.id === uid);

   if(!uid || !user) {
     return res.status(401).json({error:"unauthorized access"})
   }
   req.user = user;
   
   next()
} 