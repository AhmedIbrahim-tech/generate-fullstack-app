export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Unexpected error";
}
