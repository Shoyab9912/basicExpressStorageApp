import { ApiError } from "./ApiError.js";



class NotFoundError extends ApiError {
    constructor(message="resource not found") {
        super(404,message)
    }
}



class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}



class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}



export {
    NotFoundError,
    ConflictError,
    ValidationError,
    UnauthorizedError,
    BadRequestError
}