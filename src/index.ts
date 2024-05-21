import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { createTerminal, killTerminal } from "./utils/terminal";
import {
  HOME_DIR,
  addFile,
  getFileContent,
  getFileStructure,
  getFiles,
  updateLocalInContainer,
  uploadAllChangedFiles,
} from "./utils/files";
import { z } from "zod";
import morgan from "morgan";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["*"],
    methods: ["GET", "POST"],
  },
});

app.use(express.json());
app.use(morgan("tiny"));

app.get("/health", (req, res) => {
  console.log("Health check for sandbox");
  res.json({ message: "Healthy Sandbox!" });
});

io.on("connection", (socket) => {
  console.log("Connecting to socket");
  const userId = socket.handshake.query.userId;
  const parsedUserId = z.string().safeParse(userId);

  if (!parsedUserId.success) {
    return socket.disconnect();
  }

  const userIdAsString = parsedUserId.data;

  console.log(`User connected: ${userIdAsString}`);

  getFiles(userIdAsString, socket);
  createTerminal(socket);
  getFileStructure(socket);

  socket.on("getFileStructure", () => getFileStructure(socket));

  fs.watch(HOME_DIR, { recursive: true }, (eventType, filename) => {
    socket.emit("fileChanged", { filename, eventType });
  });

  socket.on("addFile", async (data: { filePath: string; isDir: boolean }) => {
    await addFile(data);
    io.emit("newFileCreated", data);
  });

  socket.on("getFile", async ({ filePath }: { filePath: string }) => {
    const fileContent = getFileContent(filePath);
    socket.emit("file", { filePath, fileContent });
  });

  socket.on("updateContent", async ({ filePath, fileContent }) => {
    updateLocalInContainer(filePath, fileContent);
    socket.emit("fileContentUpdated", { filePath, fileContent });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userIdAsString}`);
    killTerminal();
    uploadAllChangedFiles(userIdAsString);
  });
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
