export function validateRequest(schema) {
  return function requestValidator(request, response, next) {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      return response.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          message: "Please correct the submitted information.",
        },
        success: false,
      });
    }

    request.validatedBody = result.data;
    return next();
  };
}

export function validateJsonField(fieldName, schema) {
  return function jsonFieldValidator(request, response, next) {
    let payload;

    try {
      payload = JSON.parse(request.body[fieldName] ?? "");
    } catch {
      return response.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          details: [{ field: fieldName, message: "Submit valid JSON data." }],
          message: "Please correct the submitted information.",
        },
        success: false,
      });
    }

    const result = schema.safeParse(payload);

    if (!result.success) {
      return response.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          message: "Please correct the submitted information.",
        },
        success: false,
      });
    }

    request.validatedBody = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return function queryValidator(request, response, next) {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      return response.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          message: "Please correct the submitted filters.",
        },
        success: false,
      });
    }

    request.validatedQuery = result.data;
    return next();
  };
}
