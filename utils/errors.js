import { ApiError } from "./ApiError.js";



class NotFoundUser extends ApiError {
    constructor(message="resource not found") {
        super(404,message)
    }
}




class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}



class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}



export {
    NotFoundUser,
    ConflictError,
    ValidationError,
    UnauthorizedError
}