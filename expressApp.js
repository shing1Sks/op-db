import e from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = e();
var corsOptions = {};
if (process.env.CORS_ORIGIN == "*") {
  corsOptions = {
    origin: (origin, callback) => {
      callback(null, origin);
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
} else {
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.options("*", cors());
}

app.use(e.json({ limit: "32kb" }));
app.use(e.urlencoded({ extended: true, limit: "32kb" }));
app.use(e.static("public"));
app.use(cookieParser());

//routes import section - 1
import userRoutes from "./routes/user.routes.js";
import postsRoutes from "./routes/posts.routes.js";

//routes declaration section - 2
app.use("/api/user", userRoutes);
app.use("/api/posts", postsRoutes);

export default app;
