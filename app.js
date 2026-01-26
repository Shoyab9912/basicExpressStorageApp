import express from "express";
import cors from "cors";
import path from "node:path";
import { readdir, stat, rename, rm, mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/directory", handler);
app.get("/directory/*filename", handler);

function safeStoragePath(...parts) {
  const base = path.resolve(import.meta.dirname, "storage")
  const target = path.resolve(base, ...parts)
  if (base !== target && !target.startsWith(base + path.sep)) {
    throw new Error("invalid path")
  }

  return target
}


async function handler(req, res) {
  try {

    
    const dirPath = safeStoragePath(...(req.params.filename ?? []))

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

app.post("/directory/*dirname", async (req, res) => {
  const parts = req.params.dirname ?? [];
  const filePath = safeStoragePath(...parts);

  try {
    await mkdir(filePath)
    return res.status(200).json({
      message: "successfuly folder created"
    })
  } catch (err) {
    return res.status(500).json({
      message: err.message || "sever side error"
    })
  }
})


app.get("/files/*filename", (req, res) => {
  const filePath = safeStoragePath(...req.params.filename)

  if (req.query.action === "download") {
    res.setHeader("Content-Disposition", "attachment");
  }


  return res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(404).json({
        message: "File not found",
      });
    }
  });
});

app.post("/files/*filename", (req, res) => {

  try {
    const filePath = safeStoragePath(...req.params.filename)
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

app.patch("/files/*filename", async (req, res) => {
  try {
    const filename = safeStoragePath(...req.params.filename)
    const newFilename = safeStoragePath(...req.body.newFilename.split("/"))

    await rename(filename, newFilename)

    return res.status(200).json({
      message: "file renamed successfully",
    });
  } catch (error) {
    return res.status(404).json({
      message: error.message,
    });
  }
});

app.delete("/files/*filename", async (req, res) => {
  try {
    const filePath = safeStoragePath(...req.params.filename)

    await rm(filePath, { recursive: true });

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
