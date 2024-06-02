import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/posts.models.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { v2 as cloudinary } from "cloudinary";

const createPost = asyncHandler(async (req, res, next) => {
  const { title, content } = req.body;
  const project = req.user.project;
  const images = req.files;
  var uploadedImages;
  if (images && Array.isArray(images) && images.length > 0) {
    uploadedImages = await Promise.all(
      images.map(async (image) => {
        const response = await uploadOnCloudinary(image.path);
        return response.url;
      })
    );
  }

  if (!title || !content) {
    throw new ApiError(400, "title and content are required");
  }

  const post = new Post({
    title,
    content,
    images: uploadedImages,
    owner: req.user._id,
    project,
  });

  await post.save();

  const user = await User.findById(req.user._id);

  user.posts.push(post._id);
  await user.save();

  res.status(201).json(new ApiResponse(201, "post created successfully", post));
});

const getPosts = asyncHandler(async (req, res, next) => {
  const project = req.user.project;
  const posts = await Post.find({ project })
    .populate("owner", "username")
    .populate("comments", "text user")
    .populate("likes", "username");
  //   const posts = await Post.aggregate([
  //     { $match: { project } },
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "owner",
  //         foreignField: "_id",
  //         as: "owner",
  //       },
  //     },
  //     { $unwind: "$owner" },
  //     {
  //       $lookup: {
  //         from: "comments",
  //         localField: "comments",
  //         foreignField: "_id",
  //         as: "comments",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "comments.user",
  //         foreignField: "_id",
  //         as: "comments.user",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "likes",
  //         foreignField: "_id",
  //         as: "likes",
  //       },
  //     },
  //     {
  //       $addFields: {
  //         likesCount: { $size: "$likes" },
  //       },
  //     },
  //   ]);

  posts.forEach(async (post) => {
    post.views += 1;
    await post.save();
  });

  res
    .status(200)
    .json(new ApiResponse(200, "posts fetched successfully", posts));
});

const deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.post);

  if (!post) {
    throw new ApiError(404, "post not found");
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "unauthorized");
  }

  post.images.forEach(async (image) => {
    await cloudinary.uploader.destroy(image);
  });

  await post.remove();

  const user = await User.findById(req.user._id);

  user.posts.pull(post._id);
  await user.save();

  res.status(200).json(new ApiResponse(200, "post deleted successfully"));
});

const updatePost = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  var post = user.posts;
  post = post[req.body.index];
  post = await Post.findById(post);
  if (!post) {
    throw new ApiError(404, "post not found");
  }

  const { title, content } = req.body;
  if (!title && !content) {
    throw new ApiError(400, "title and content are required");
  }

  if (title) {
    post.title = title;
  }

  if (content) {
    post.content = content;
  }

  await post.save();

  res.status(200).json(new ApiResponse(200, "post updated successfully", post));
});

const likePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.body.post);
  const project = req.user.project;
  if (!post) {
    throw new ApiError(404, "post not found");
  }

  if(post.project !== project) {
    throw new ApiError(403, "unauthorized");
  }

  if (post.likes.includes(req.user._id)) {
    throw new ApiError(400, "post already liked");
  }

  post.likes.push(req.user._id);

  await post.save();

  const user = await User.findById(req.user._id);

  user.likes.push(post._id);
  await user.save();

  res.status(200).json(new ApiResponse(200, "post liked successfully", post));
});

const unlikePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.body.post);
  if (!post) {
    throw new ApiError(404, "post not found");
  }

  if (!post.likes.includes(req.user._id)) {
    throw new ApiError(400, "post not liked");
  }

  post.likes.pull(req.user._id);

  await post.save();

  const user = await User.findById(req.user._id);

  user.likes.pull(post._id);
  await user.save();

  res.status(200).json(new ApiResponse(200, "post unliked successfully", post));
});

const addCommentToPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.body.post);
  const project = req.user.project;

  if(post.project !== project) {
    throw new ApiError(403, "unauthorized");
  }

  if (!post) {
    throw new ApiError(404, "post not found");
  }

  const comment = new Comment({
    user: req.user._id,
    text: req.body.text,
  });

  post.comments.push(comment._id);
  await post.save();

  comment.post = post._id;
  await comment.save();

  const user = await User.findById(req.user._id);

  user.comments.push(comment._id);
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, "comment added successfully", comment));
});

const deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.body.comment);
  if (!comment) {
    throw new ApiError(404, "comment not found");
  }

  if (comment.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "unauthorized");
  }

  await Comment.findByIdAndDelete(comment._id);

  const user = await User.findById(req.user._id);

  user.comments.pull(comment._id);
  await user.save();

  const post = await Post.findById(comment.post);

  post.comments.pull(comment._id);
  await post.save();

  res.status(200).json(new ApiResponse(200, "comment deleted successfully"));
});

const getLikedPosts = asyncHandler(async (req, res, next) => {
  const posts = await Post.find({ likes: req.user._id });
  res
    .status(200)
    .json(new ApiResponse(200, "posts fetched successfully", posts));
});

const searchPost = asyncHandler(async (req, res, next) => {
  const query = req.body.query;
  const project = req.user.project;
  const posts = await Post.find({
    title: { $regex: query, $options: "i" },
    project,
  });
  res
    .status(200)
    .json(new ApiResponse(200, "posts fetched successfully", posts));
});

const getPostCreatedByUser = asyncHandler(async (req, res, next) => {
  const posts = await Post.find({ owner: req.user._id });
  res
    .status(200)
    .json(new ApiResponse(200, "posts fetched successfully", posts));
});

export {
  createPost,
  getPosts,
  deletePost,
  updatePost,
  likePost,
  unlikePost,
  addCommentToPost,
  deleteComment,
  getLikedPosts,
  searchPost,
  getPostCreatedByUser,
};
