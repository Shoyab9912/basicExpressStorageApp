import { Redis } from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
  process.exit(1);
});


process.on("SIGINT", async () => {
  console.log("Closing Redis connection");
  await redis.quit();
  process.exit(0);
});

export default redis;
