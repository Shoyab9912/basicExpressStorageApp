import express from "express";
import cors from "cors";
import path from "path"
import { fileURLToPath } from "node:url";
import fileRoutes from "./routes/file.route.js"
import directoryRoutes from "./routes/directory.route.js"
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.locals.storageBase = path.join(__dirname,"storage")


app.use('/directory',directoryRoutes)
app.use('/file',fileRoutes)



app.listen(3000, () => {
  console.log("server is listening");
});
