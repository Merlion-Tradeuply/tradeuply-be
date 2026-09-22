import { v2 as cloudinary } from "cloudinary";

import { env } from "./env.js";

cloudinary.config({
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  cloud_name: env.cloudinaryCloudName,
  secure: true,
});

export { cloudinary };
