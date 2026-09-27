export function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}
