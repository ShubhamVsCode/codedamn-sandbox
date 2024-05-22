import express from "express";
import dotenv from "dotenv";
import http from "http";
import { createProxyMiddleware } from "http-proxy-middleware";

import { Server } from "socket.io";
import { createTerminal, killTerminal } from "./utils/terminal";
import {
  addFile,
  getFileContent,
  getFileStructure,
  getFiles,
  updateLocalInContainer,
  uploadAllChangedFiles,
  watchFiles,
} from "./utils/files";
import { z } from "zod";
import morgan from "morgan";
import { monitorContainer } from "./utils/monitor";

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
  console.log(req.headers);
  console.log("Health check for sandbox");
  res.json({ message: "Healthy Sandbox!" });
});

app.use((req, res, next) => {
  // const runningAppPort = req.headers["x-forwarded-port"];
  // console.log(`Running app port: ${runningAppPort}`);
  // if (runningAppPort) {
  //   const target = `http://localhost:${runningAppPort}`;
  //   console.log(`Proxying request to ${target}`);
  //   return createProxyMiddleware({
  //     target,
  //     changeOrigin: true,
  //   })(req, res, next);
  // } else {
  next();
  // }
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
  getFileStructure(socket);
  const terminal = createTerminal(socket);
  setInterval(() => monitorContainer(userIdAsString), 10000);

  socket.on("getFileStructure", () => getFileStructure(socket));

  watchFiles(socket);

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
    killTerminal(terminal);
    uploadAllChangedFiles(userIdAsString);
  });
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
