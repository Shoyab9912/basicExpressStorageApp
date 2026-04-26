import Directory from "../models/directory.model.js";
import File from "../models/file.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { BadRequestError, NotFoundError, UnauthorizedError, ValidationError } from "../utils/errors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import getAccess from "../utils/getAccess.js";
import User from "../models/user.model.js";


const shareViaEmail = asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = req.params;
    const { email, permission } = req.body;

    if ([resourceType, resourceId, email, permission].some(f => !f || String(f).trim() === "")) {
        throw new ValidationError("Input all fields")
    }

    const Model = resourceType === "file" ? File : Directory
    const sharedResource = await Model.findById(resourceId)

    if (!sharedResource) {
        throw new NotFoundError("Resource doesn't exists")
    }

    const role = getAccess(req.user?._id, sharedResource)

    if (!role || role == "viewer") {
        throw new UnauthorizedError("you cant access this resource")
    }

    const user = await User.findOne({ email })

    if (!user) {
        throw new NotFoundError("User not found")
    }

    if (user._id.equals(sharedResource.userId)) {
        throw new BadRequestError("Cannot share with the owner");
    }

     
    if (user._id.equals(req.user._id)) {
        throw new BadRequestError("Cannot share with yourself");
    }

    const alreadyShared = sharedResource.sharedWith.some(u => u.userId.equals(user._id))

    if (alreadyShared) {
        throw new BadRequestError("User already has access, use update permission instead")
    }


    const result = await Model.findByIdAndUpdate(
        resourceId,
        {
            $push: {
                sharedWith: {
                    userId: user._id,
                    permission
                }
            }
        },
        { new: true }
    );

    if (!result) {
        throw new NotFoundError("Resource doesnt exist")
    }

    return res.status(201).json(new ApiResponse(201, result))

})


export {
    shareViaEmail
}