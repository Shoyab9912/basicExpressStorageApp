import express from "express";
import cors from "cors";
import path from "node:path";
import { readdir, stat, rename, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/directory", handler);
app.get("/directory/:filename", handler);

async function handler(req, res) {
  try {
    const folder = req.params.filename ?? "";
    const dirPath = path.join("./storage", folder);

    const lists = await readdir(dirPath);

    const resData = await Promise.all(
      lists.map(async (item) => {
        const st = await stat(path.join(dirPath, item));
        return { name: item, isDirectory: st.isDirectory() };
      })
    );

    return res.status(200).json(resData);
  } catch (error) {
    return res.status(404).json({
      message: error.message,
    });
  }
}

app.get("/files/:filename", (req, res) => {
  const { filename } = req.params;

  if (req.query.action === "download") {
    res.setHeader("Content-Disposition", "attachment");
  }

  const filePath = path.join(import.meta.dirname, "storage", filename);

  // ✅ This is the correct way to handle sendFile errors
  return res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(404).json({
        message: "File not found",
      });
    }
  });
});

app.post("/files/:filename", (req, res) => {
  const { filename } = req.params;

  try {
    const filePath = path.join("./storage", filename);
    const writeStream = createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on("finish", () => {
      return res.status(201).json({
        message: "successfully uploaded",
      });
    });

    
    writeStream.on("error", (err) => {
      return res.status(500).json({
        message: err.message || "Upload failed",
      });
    });

    req.on("error", (err) => {
      return res.status(500).json({
        message: err.message || "Request stream error",
      });
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "server side problem",
    });
  }
});

app.patch("/files/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const { newFilename } = req.body;

    if (!newFilename) {
      return res.status(400).json({
        message: "newFilename is required",
      });
    }

    await rename(
      path.join("./storage", filename),
      path.join("./storage", newFilename)
    );

    return res.status(200).json({
      message: "file renamed successfully",
    });
  } catch (error) {
    return res.status(404).json({
      message: error.message,
    });
  }
});

app.delete("/files/:filename", async (req, res) => {
  try {
    const filePath = path.join("./storage", req.params.filename);

    await rm(filePath, { force: true });

    return res.status(200).json({
      message: "successfully removed",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "server side error",
    });
  }
});

app.listen(3000, () => {
  console.log("server is listening");
});
