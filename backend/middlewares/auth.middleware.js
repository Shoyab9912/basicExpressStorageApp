import  asyncHandler from "../utils/asyncHandler.js";
import { ForbiddenError, UnauthorizedError, BadRequestError } from "../utils/errors.js";
import User from "../models/user.model.js"
import Session from "../models/session.model.js";

export default asyncHandler(async (req, res, next) => {
    const sid = req.signedCookies.sessionId;

    if (!sid) {
        throw new BadRequestError("Invalid session ID");
    }

    const session = await Session.findById(sid).lean();

    if (!session) {
        throw new UnauthorizedError("Unauthorized access");
    }

    const user = await User.findById(session.userId)
        .select("-password");

    if (!user || user.isDeleted) {
        throw new UnauthorizedError("Unauthorized access");
    }

    req.user = user;
    next();
});



export function checkRole(...allowedRoles) {
  return async function (req, res, next) {
    if (!allowedRoles.includes(req.user.role)) {
       throw new ForbiddenError("You don't have permission to access this resource");
    }
    next();
  };
}