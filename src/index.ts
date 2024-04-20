import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { createTerminal, killTerminal } from "./utils/terminal";
import {
  createFileInContainer,
  getFileContent,
  getFiles,
  updateLocalInContainer,
  uploadFile,
} from "./utils/files";
import { z } from "zod";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
  },
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ message: "Healthy!" });
});

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  const userIdAsString = z.string().parse(userId);

  console.log(`User connected: ${userIdAsString}`);

  createTerminal(socket);
  getFiles(userIdAsString, socket);

  socket.on("newFile", async (fileName: string) => {
    await createFileInContainer(fileName);
    await uploadFile(userIdAsString, fileName, "");
    socket.emit("newFileCreated", fileName);
  });

  socket.on("getFileContent", async (fileName: string) => {
    const fileContent = await getFileContent(fileName);
    socket.emit("fileContent", { fileName, fileContent });
  });

  socket.on("updateContent", async ({ fileName, fileContent }) => {
    await uploadFile(userIdAsString, fileName, fileContent);
    await updateLocalInContainer(fileName, fileContent);
    socket.emit("fileContentUpdated", { fileName, fileContent });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userIdAsString}`);
    killTerminal();
  });
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
