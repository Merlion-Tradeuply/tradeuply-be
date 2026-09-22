import multer from "multer";

import { AppError } from "../utils/app-error.js";
import { getUploadResourceType } from "../services/upload.service.js";

const maximumUploadBytes = 4 * 1024 * 1024;

const upload = multer({
  fileFilter(_request, file, callback) {
    try {
      getUploadResourceType(file.mimetype);
      callback(null, true);
    } catch (error) {
      callback(error);
    }
  },
  limits: { fileSize: maximumUploadBytes, files: 1 },
  storage: multer.memoryStorage(),
});

export function uploadSingleFile(fieldName = "file") {
  const middleware = upload.single(fieldName);

  return function handleUpload(request, response, next) {
    middleware(request, response, (error) => {
      if (!error) return next();

      if (error.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError("The uploaded file must be 4 MB or smaller.", {
            code: "UPLOAD_TOO_LARGE",
            statusCode: 413,
          }),
        );
      }

      return next(error);
    });
  };
}
