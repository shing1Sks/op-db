import {
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
  getStoredData
} from "../controllers/user.controllers.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/get-user").get(verifyJWT, getUser);
router.route("/add-score").post(verifyJWT, addScore);
router.route("/leaderboard").get(verifyJWT, getLeaderboard);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/update-email").patch(verifyJWT, updateEmail);
router.route("/change-password").patch(verifyJWT, changePassword);
router.route("/store-data").patch(verifyJWT, storeDataForUser);
router.route("/get-stored-data").get(verifyJWT, getStoredData);

export default router;
