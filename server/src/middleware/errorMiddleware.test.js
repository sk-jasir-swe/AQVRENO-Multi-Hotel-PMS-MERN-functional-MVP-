import test from "node:test";
import assert from "node:assert/strict";
import errorMiddleware from "./errorMiddleware.js";

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("internal errors return a generic message, not database details", () => {
  const response = responseRecorder();
  const previousError = console.error;
  let logged = false;
  console.error = () => {
    logged = true;
  };

  try {
    errorMiddleware(
      new Error("MongoServerError: failed to connect to mongodb://secret"),
      { method: "GET", originalUrl: "/api/rooms?token=secret" },
      response,
      () => {},
    );
  } finally {
    console.error = previousError;
  }

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    success: false,
    message: "Something went wrong. Please try again.",
  });
  assert.equal(logged, true);
  assert.equal(JSON.stringify(response.body).includes("mongodb"), false);
});

test("validation and duplicate errors return safe client messages", () => {
  const validationResponse = responseRecorder();
  errorMiddleware(
    Object.assign(new Error("secret schema path details"), {
      name: "ValidationError",
    }),
    { method: "POST", originalUrl: "/api/rooms" },
    validationResponse,
    () => {},
  );
  assert.equal(validationResponse.statusCode, 400);
  assert.equal(
    validationResponse.body.message,
    "Please check your information and try again.",
  );

  const duplicateResponse = responseRecorder();
  errorMiddleware(
    Object.assign(new Error("duplicate index: users.email"), { code: 11000 }),
    { method: "POST", originalUrl: "/api/staff" },
    duplicateResponse,
    () => {},
  );
  assert.equal(duplicateResponse.statusCode, 409);
  assert.equal(
    duplicateResponse.body.message,
    "This action conflicts with existing information.",
  );
});
