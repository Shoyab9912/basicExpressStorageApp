import express from "express";
import cors from "cors";
import path from "path"
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import fileRoutes from "./routes/file.route.js"
import directoryRoutes from "./routes/directory.route.js"
import userRoutes from "./routes/user.route.js"
import checkAuth from "./middlewares/auth.js"
import connectDb from "./config/db.js"


const secretKey = "fff"

const app = express();
try {
  await connectDb();
  console.log("Database connected successfully");
} catch (err) {
  console.error("Failed to connect DB:", err);
  process.exit(1); // stop server if DB fails
}


app.use(cookieParser(secretKey))
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.locals.storageBase = path.join(__dirname, "storage")

app.use('/directory', checkAuth, directoryRoutes)
app.use('/file', checkAuth, fileRoutes)
app.use("/user", userRoutes)



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: "Something went wrong"
  });
});



app.listen(4000, () => {
  console.log("server is listening");
});
