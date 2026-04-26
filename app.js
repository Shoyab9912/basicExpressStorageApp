import express from "express";
import cors from "cors";
import path from "path"
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import fileRoutes from "./routes/file.route.js"
import directoryRoutes from "./routes/directory.route.js"
import userRoutes from "./routes/user.route.js"
import authRoutes from "./routes/auth.route.js"
import shareRoutes from "./routes/share.route.js"
import connectDb from "./config/db.js"
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();


app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.locals.storageBase = path.join(__dirname, "storage")

app.use('/directory',directoryRoutes)
app.use('/file',fileRoutes)
app.use("/", userRoutes)
app.use("/auth", authRoutes)
app.use('/share',shareRoutes)




app.use(errorHandler)

connectDb().then(() => {
    console.log("DB connection successful");
    app.listen(process.env.PORT, () => {
      console.log("Server is listening on port " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
