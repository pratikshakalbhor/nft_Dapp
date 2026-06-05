export const errorHandler = (error) => {
  console.error("App Error:", error);

  if (error?.message) {
    return error.message;
  }

  return "Something went wrong";
};