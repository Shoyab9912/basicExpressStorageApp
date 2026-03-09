import { ApiError } from "./ApiError.js";



class NotFoundError extends ApiError {
    constructor(message="resource not found") {
        super(404, message)
    }
}



class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation failed') {
    super(422, message);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}



class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}



export {
    NotFoundError,
    ConflictError,
    ValidationError,
    UnauthorizedError,
    BadRequestError
}