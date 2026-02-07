import { ObjectId } from "mongodb";

export default async function checkAuth(req, res, next) {
  try {
    const { uid } = req.cookies;

    // Reject if uid is missing or not a valid ObjectId
    if (!uid || !ObjectId.isValid(uid)) {
      return res.status(400).json({ message: "invalid uid" });
    }

    const user = await req.db.collection("users").findOne(
      { _id: new ObjectId(uid) },
      { projection: { password: 0 } }
    );

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