import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Group } from "../models/studyGroup.model.js";
import { Resource } from "../models/Resources.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import path from 'path';
import fs from 'fs';
import { Dropbox } from "dropbox";


const addResource = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const { title, description } = req.body;
    const file = req.file;

    if (!title || !description) {
      throw new ApiError(400, "Enter all fields");
    }

    if (!file || !file.path) {
      throw new ApiError(400, "No file uploaded");
    }

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(400, "Group not found");
    }

    const isMember = group.members.includes(userId);
    if (!isMember) {
      throw new ApiError(403, "Adding resource is prohibited !!");
    }

    // 📤 Upload to Dropbox
    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

    const filePath = file.path;
    const dropboxPath = `/resources/${file.filename}`;
    const fileContent = fs.readFileSync(filePath);

    const uploadResponse = await dbx.filesUpload({
      path: dropboxPath,
      contents: fileContent,
      mode: 'add',
      autorename: true,
      mute: false
    });

    // 📎 Generate shareable link
    const sharedLinkResp = await dbx.sharingCreateSharedLinkWithSettings({
      path: uploadResponse.result.path_display,
    });

    const dropboxUrl = sharedLinkResp.result.url.replace("?dl=0", "?raw=1");

    // ✅ Save metadata to DB
    const newResource = await Resource.create({
      title,
      url: dropboxUrl,
      description,
      sharedBy: userId,
    });

    await Group.updateOne(
      { _id: groupId },
      { $push: { resources: newResource._id } }
    );

    // 🧹 Delete local file (optional)
    fs.unlinkSync(filePath);

    return res.status(200).json(
      new ApiResponse(200, newResource, "Resource uploaded to Dropbox and saved")
    );

  } catch (error) {
    console.error("Error uploading to Dropbox:", error);
    throw new ApiError(500, error?.message);
  }
});

const getResources = asyncHandler(async(req, res) => {
    try {
        const { groupId } = req.params

        const group = await Group.findById(groupId).populate('resources', 'title url description _id')

        if(!group) {
            throw new ApiError(400, "Failed to find group")
        }
        
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                group.resources,
                "Fetched group's resources"    
            )
        )
    } catch (error) {
        throw new ApiError(500, error?.message)
    }
})

const deleteResources = asyncHandler(async(req, res) => {
    try {
        const {resourceId} = req.body

        const resource = await Resource.findByIdAndDelete(resourceId)

        if(!resource){
            throw new ApiError(400, "Resource does not exist")
        }

        const group = await Group.updateMany(
           { 
            resources: resourceId
           },
           {
            $pull:{
                resources: resourceId
            }
           }

        )

 
        const arr = resource.url.split('/')
        console.log("Printing arr" + arr)
        await deleteFromCloudinary(arr[arr.length - 1])

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                resource,
                "Fetched resources"
            )
        )
    } catch (error) {
        throw new ApiError(500, error?.message)
    }
})

export {
    addResource,
    getResources,
    deleteResources
}