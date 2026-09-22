import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const documentMimeTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizeSegment(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildUploadFolder(...segments) {
  const safeSegments = segments.map(sanitizeSegment).filter(Boolean);
  return ["tradeuply", ...safeSegments].join("/");
}

export function getUploadResourceType(mimeType) {
  if (imageMimeTypes.has(mimeType)) return "image";
  if (documentMimeTypes.has(mimeType)) return "raw";

  throw new AppError("This file type is not supported.", {
    code: "UNSUPPORTED_FILE_TYPE",
    statusCode: 415,
  });
}

function assertCloudinaryConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new AppError("The upload service is not configured.", {
      code: "UPLOAD_SERVICE_NOT_CONFIGURED",
      statusCode: 503,
    });
  }
}

export function uploadFile({ buffer, folder, mimeType, publicId }) {
  assertCloudinaryConfigured();

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError("A non-empty file is required.", {
      code: "UPLOAD_FILE_REQUIRED",
      statusCode: 400,
    });
  }

  const resourceType = getUploadResourceType(mimeType);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        invalidate: true,
        overwrite: true,
        public_id: publicId,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result?.secure_url || !result?.public_id) {
          reject(
            new AppError("The file could not be uploaded.", {
              code: "CLOUDINARY_UPLOAD_FAILED",
              statusCode: 502,
            }),
          );
          return;
        }

        resolve({
          bytes: result.bytes,
          format: result.format,
          height: result.height ?? null,
          mimeType,
          publicId: result.public_id,
          resourceType,
          secureUrl: result.secure_url,
          width: result.width ?? null,
        });
      },
    );

    uploadStream.on("error", () => {
      reject(
        new AppError("The upload stream was interrupted.", {
          code: "UPLOAD_STREAM_FAILED",
          statusCode: 502,
        }),
      );
    });
    uploadStream.end(buffer);
  });
}

export async function deleteUploadedFile(publicId, resourceType = "image") {
  if (!publicId) return;
  assertCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: resourceType,
  });
}
