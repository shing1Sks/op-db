import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const schema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Please provide a username"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    project: {
      type: String,
      required: [true, "Please provide a project name"],
      lowercase: true,
      trim: true,
      index: true,
    },
    fullname: {
      type: String,
      required: [true, "Please provide a fullname"],
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    refreshtoken: {
      type: String,
    },
    score: {
      type: Number,
      default: 0,
    },
    avatar: {
      type: String,
    },
    userdata: {
      type: Object,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

schema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const hash = bcrypt.hashSync(this.password, 8);
    this.password = hash;
  }
  next();
});

schema.methods.generateAccessToken = async function () {
  const accessToken = jwt.sign(
    {
      _id: this._id,
      project: this.project,
      fullname: this.fullname,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIREY,
    }
  );
  return accessToken;
};

schema.methods.generateRefreshToken = async function () {
  const refreshToken = jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIREY,
    }
  );
  return refreshToken;
};

schema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", schema);
