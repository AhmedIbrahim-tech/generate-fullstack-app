export function getErrorMessage(error) {
  if (error && typeof error === "object" && "response" in error) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unexpected error";
}
