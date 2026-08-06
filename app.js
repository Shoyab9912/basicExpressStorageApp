import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import fileRoutes from "./routes/file.route.js";
import directoryRoutes from "./routes/directory.route.js";
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import shareRoutes from "./routes/share.route.js";
import subscriptionRoutes from "./routes/subscription.route.js";
import webhookRoutes from "./routes/webhook.route.js";
import healthRoutes from "./routes/health.route.js";
import adminRoutes from "./routes/admin.route.js";
import connectDb from "./config/db.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

app.use("/api/v1/directories", directoryRoutes);
app.use("/api/v1/files", fileRoutes);

app.use("/api/v1/shares", shareRoutes);

app.use("/api/v1/subscriptions", subscriptionRoutes);

app.use("/api/v1/webhooks", webhookRoutes);

app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/health", healthRoutes);

app.use(errorHandler);


export {app}

connectDb()
  .then(() => {
    console.log("DB connection successful");
    app.listen(process.env.PORT, () => {
      console.log("Server is listening on port " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
