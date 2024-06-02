import {
    createPost,
    getPosts,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getLikedPosts,
    searchPost,
    addCommentToPost,
    deleteComment,
    getPostCreatedByUser
}    from "../controllers/posts.controllers.js";
  import { Router } from "express";
  import { upload } from "../middlewares/multer.middleware.js";
  import { verifyJWT } from "../middlewares/auth.middleware.js";
  
  const router = Router();

  router.route("/create").post(verifyJWT, upload.array("images"), createPost);
  router.route("/get-posts").get(verifyJWT,getPosts);
  router.route("/get-user-posts").get(verifyJWT, getPostCreatedByUser);
  router.route("/delete").delete(verifyJWT, deletePost);
  router.route("/update").post(verifyJWT, updatePost);
  router.route("/search").get(verifyJWT, searchPost);
  router.route("/like").post(verifyJWT, likePost);
  router.route("/unlike").post(verifyJWT, unlikePost);
  router.route("/liked-posts").get(verifyJWT, getLikedPosts);
  router.route("/comments").post(verifyJWT, addCommentToPost);
  router.route("/comments").delete(verifyJWT, deleteComment);
  
  export default router;