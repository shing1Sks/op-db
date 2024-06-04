import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath) => {
  
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET 
});

    try {       
        if(!localFilePath)
        {
            console.log("file not found");
            return null;
        }
        else{
            const response = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"});
            //file upload success
            fs.unlink(localFilePath, (err) => {
                if (err) throw err;
            });
            return response;
        }
    } catch (error) {
      console.log(error);
        fs.unlink(localFilePath);
        //removes the locally saved file as the method failed
        return null;
    }
}

export {uploadOnCloudinary};