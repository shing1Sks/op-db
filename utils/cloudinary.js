import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("file not found @ cloudinary.js ! ");
      return null;
    } else {
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
      });
      // console.log("file upload success !", response.url);
      fs.unlink(localFilePath, (e) => {
        if (e) throw e;
      });
      return response;
    }
  } catch (error) {
    fs.unlink(localFilePath);
    return null;
  }
};


export {uploadOnCloudinary}