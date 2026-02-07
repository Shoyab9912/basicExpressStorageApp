import express from "express";
import cors from "cors";
import path from "path"
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import fileRoutes from "./routes/file.route.js"
import directoryRoutes from "./routes/directory.route.js"
import userRoutes from "./routes/user.route.js"
import checkAuth from "./middlewares/auth.js"
import connectDb from "./db.js"

let db;
const app = express();
try {
  db = await connectDb();
  console.log("Database connected successfully");
} catch (err) {
  console.error("Failed to connect DB:", err);
  process.exit(1); // stop server if DB fails
}


app.use(cookieParser())
app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
}));
app.use(express.json());



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.locals.storageBase = path.join(__dirname,"storage")

app.use((req,res,next) => {
  req.db = db()
  next()
})
app.use('/directory',checkAuth,directoryRoutes)
app.use('/file',checkAuth,fileRoutes)
app.use("/user",userRoutes)



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong"
  });
});



app.listen(4000, () => {
  console.log("server is listening");
});
