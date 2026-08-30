import axios from "axios";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string" && data.length > 0) {
      return data;
    }

    if (
      data &&
      typeof data === "object" &&
      "title" in data &&
      typeof data.title === "string" &&
      data.title.length > 0
    ) {
      return data.title;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Unexpected error";
}
