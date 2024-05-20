import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { createTerminal, killTerminal } from "./utils/terminal";
import {
  HOME_DIR,
  createFileInContainer,
  getFileContent,
  getFileStructure,
  readDirectory,
  updateLocalInContainer,
  uploadFile,
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

  createTerminal(socket);
  getFileStructure(socket);

  socket.on("getFileStructure", () => getFileStructure(socket));

  socket.on(
    "addFile",
    async ({ filePath, isDir }: { filePath: string; isDir: boolean }) => {
      const fullPath = path.join(HOME_DIR, filePath);
      console.log(`Adding ${isDir ? "directory" : "file"} at ${fullPath}`);
      try {
        const dirPath = isDir ? fullPath : path.dirname(fullPath);
        fs.mkdirSync(dirPath, { recursive: true });
        if (!isDir) {
          fs.writeFileSync(fullPath, "");
        }
        io.emit("newFileCreated", { filePath: fullPath, isDir });
      } catch (error) {
        console.error(`Error adding ${isDir ? "directory" : "file"}:`, error);
        socket.emit("error", { message: error });
      }
    },
  );

  socket.on("newFile", async (fileName: string) => {
    // await createFileInContainer(fileName);
    // await uploadFile(userIdAsString, fileName, "");
    // socket.emit("newFileCreated", fileName);
  });

  socket.on("getFileContent", async (fileName: string) => {
    const fileContent = await getFileContent(fileName);
    socket.emit("fileContent", { fileName, fileContent });
  });

  socket.on("updateContent", async ({ fileName, fileContent }) => {
    // console.log(`Updating file ${fileName}`);
    // await uploadFile(userIdAsString, fileName, fileContent);
    // await updateLocalInContainer(fileName, fileContent);
    socket.emit("fileContentUpdated", { fileName, fileContent });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userIdAsString}`);
    killTerminal();
  });
});

fs.watch(HOME_DIR, { recursive: true }, (eventType, filename) => {
  io?.emit("fileChanged", { filename, eventType });
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
