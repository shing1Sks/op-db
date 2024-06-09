import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshtoken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Internal Server Error", error);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get username fullname email password avatar project
  // check if user exists
  // check if usrname is unique
  // check username,fullname and password not empty
  // upload avatar on cloudinary
  // create user
  // save cookies
  // remove password refreshtoken from response
  // check for created user
  // add cookies
  // return response

  const { username, fullname, email, password, project } = req.body;

  if (!username || !fullname || !project || !password) {
    throw new ApiError(
      400,
      "username fullname project and password are required !"
    );
  }

  const userExists = await User.findOne({ username });

  if (userExists) {
    throw new ApiError(400, "username already exists !");
  }

  var localFilePath = req?.file?.path;

  if (localFilePath) {
    const response = await uploadOnCloudinary(localFilePath);
    localFilePath = response?.url;
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullname,
    email: email || "",
    password,
    avatar: localFilePath || "",
    project,
  });

  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    user._id
  );

  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!userCreated) {
    throw new ApiError(400, "user not created !");
  }

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: userCreated, accessToken, refreshToken },
        "user created"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  // get username password
  // check if user exists
  // check if password is correct
  // generate access and refresh token
  // save cookies
  // remove password refreshtoken from response
  // check for created user
  // add cookies
  // return response
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, "username and password are required !");
  }

  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(400, "user not found !");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "password incorrect !");
  }

  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "user logged in"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // remove cookies
  // set refresh token undefined
  // return response
  var user;
  try {
    user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { refreshToken: "" } },
      { new: true }
    ).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error clearing refreshToken:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, { user }, "user logged out"));
});

const getUser = asyncHandler(async (req, res) => {
  // get user
  // return response
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(400, "user not found !");
  }
  res.status(200).json(new ApiResponse(200, { user }, "user found"));
});

const addScore = asyncHandler(async (req, res) => {
  // add score
  // get score from body and user from req
  // return response

  if (!req.body.score) {
    throw new ApiError(400, "score is required !");
  }
  if (!req.user) {
    throw new ApiError(400, "login is required !");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(400, "user not found !");
  }

  user.score = req.body.score + user.score;

  await user.save();

  res.status(200).json(new ApiResponse(200, { user }, "score added"));
});

const getUserRankInProject = async (userId, project) => {
  const user = await User.findOne({ _id: userId, project: project });
  if (!user) {
    throw new ApiError(400, "user not found");
  }
  const higherRankedUsersCount = await User.countDocuments({
    project: project,
    score: { $gt: user.score },
  });
  return higherRankedUsersCount + 1; // Rank is the count of higher scores + 1
};

const getLeaderboard = asyncHandler(async (req, res) => {
  const { project, _id } = req.user;
  try {
    const userRank = await getUserRankInProject(_id, project);
    const range = req.body.range || 5;
    // Fetch users around the specified user's rank within the project
    const lowerBound = Math.max(userRank - range, 1);
    const upperBound = userRank + range;
    const users = await User.aggregate([
      { $match: { project: project } }, // Step 1: Filter users by project
      { $sort: { score: -1 } }, // Step 2: Sort users by score in descending order
      {
        $setWindowFields: {
          partitionBy: "$project", // Partition users by project
          sortBy: { score: -1 }, // Sort within each partition by score
          output: {
            rank: { $rank: {} }, // Step 3: Assign rank based on sorted order
          },
        },
      },
      {
        $match: { rank: { $gte: lowerBound, $lte: upperBound } }, // Filter users by rank range
      },
      {
        $project: {
          _id: 1,
          username: 1,
          score: 1,
          project: 1,
          rank: 1,
        },
      },
    ]);
    const specificUser = await User.findById(_id).select(
      "-password -refreshtoken -fullname -createdAt -updatedAt -__v -avatar -email"
    );
    res.status(200).json(
      new ApiResponse(
        200,
        {
          users,
          specificUser,
          rank: userRank,
        },
        "leaderboard fetched"
      )
    );
  } catch (error) {
    res.status(500).json(new ApiError(500, "error", error));
  }
});

const updateAvatar = asyncHandler(async (req, res) => {
  var localFilePath = req.file.path;
  if (localFilePath) {
    const response = await uploadOnCloudinary(localFilePath);
    localFilePath = response?.url;
  } else {
    throw new ApiError(400, "file not found !");
  }
  const removeOldAvatar = await User.findById(req.user._id);
  if (removeOldAvatar.avatar) {
    await cloudinary.uploader.destroy(removeOldAvatar.avatar);
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: localFilePath } },
    { new: true }
  ).select("-password -refreshToken");
  res.status(200).json(new ApiResponse(200, { user }, "avatar updated"));
});

const updateEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "email is required !");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { email } },
    { new: true }
  ).select("-password -refreshToken");
  res.status(200).json(new ApiResponse(200, { user }, "email updated"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword) {
    throw new ApiError(400, "oldPassword is required !");
  }
  if (!newPassword) {
    throw new ApiError(400, "newPassword is required !");
  }

  const user = await User.findById(req.user._id).select("--refreshToken");

  if (!user) {
    throw new ApiError(400, "user not found !");
  }

  if (!(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, "oldPassword is incorrect !");
  }

  user.password = newPassword;
  await user.save();
  res.status(200).json(new ApiResponse(200, { user }, "password changed"));
});

const storeDataForUser = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data) {
    throw new ApiError(400, "data is required !");
  }
  const { _id } = req.user;
  const user = await User.findById(_id).select("-password -refreshToken");
  user.userdata = data;
  await user.save();
  res.status(200).json(new ApiResponse(200, { user }, "data stored"));
});

const getStoredData = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const user = await User.findById(_id).select(
    "-password -refreshToken -email -fullname -createdAt -updatedAt -__v -avatar"
  );
  const data = user.userdata;
  res.status(200).json(new ApiResponse(200, data, "data fetched"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  addScore,
  getLeaderboard,
  updateAvatar,
  updateEmail,
  changePassword,
  storeDataForUser,
  getStoredData,
};
