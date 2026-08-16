import Directory from "../models/directory.model.js";
import File from "../models/file.model.js";
import { BadRequestError, NotFoundError } from "./errors.js";

export default async function getResourceByType(resourceType, resourceId) {
  if (!["file", "directory"].includes(resourceType)) {
    throw new BadRequestError("Invalid resource type");
  }

  const Model = resourceType === "file" ? File : Directory;

  const resource = await Model.findById(resourceId);

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  return { Model, resource };
}