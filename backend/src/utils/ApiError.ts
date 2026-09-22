// A thrown ApiError carries the exact status+message the errorHandler middleware should
// send to the client. Anything else thrown (a real bug) is logged in full server-side but
// answered with a generic 500 -- so a stack trace or SQL error text never reaches the
// frontend (see error-handling requirements).
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }
  static unauthorized(message = "Authentication required.") {
    return new ApiError(401, message);
  }
  static forbidden(message = "You do not have permission to do that.") {
    return new ApiError(403, message);
  }
  static notFound(message = "Not found.") {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static tooManyRequests(message = "Too many requests. Please wait and try again.") {
    return new ApiError(429, message);
  }
}
