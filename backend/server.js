import "./cron/subscriptionCleanup.cron.js";
import { app } from "./app.js";
import connectDb from "./config/db.js";
import mongoose from "mongoose";
import redis from "./config/redis.js";

const PORT = process.env.PORT || 4000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server;
let isShuttingDown = false;

connectDb()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          console.log("HTTP server closed.");
          resolve();
        });
      });
    }

    await Promise.all([mongoose.connection.close(), redis.quit()]);
    console.log("MongoDB connection closed.");
    console.log("Redis connection closed.");
    console.log("Server shut down successfully.");

    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (err) {
    console.error("Error during shutdown:", err);
    clearTimeout(forceExit);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});