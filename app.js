import express from "express";
import cors from "cors";
import path from "path"
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import fileRoutes from "./routes/file.route.js"
import directoryRoutes from "./routes/directory.route.js"
import userRoutes from "./routes/user.route.js"
import connectDb from "./config/db.js"
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const secretKey = "fff"

const app = express();


app.use(cookieParser(secretKey))
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.locals.storageBase = path.join(__dirname, "storage")

app.use('/directory',directoryRoutes)
app.use('/file',fileRoutes)
app.use("/user", userRoutes)





app.use(errorHandler)

connectDb().then(() => {
    console.log("DB connection successful");
    app.listen(4000, () => {
      console.log("Server is listening on port 4000");
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
