// Optional Cloudinary adapter. Set CLOUDINARY_* credentials before enabling uploads.
import { v2 as cloudinary } from "cloudinary";
if (process.env.CLOUDINARY_CLOUD_NAME)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
export default cloudinary;
