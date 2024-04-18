import express from "express";
import dotenv from "dotenv";
import http from "http";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { Server, Socket } from "socket.io";

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

const commandBuffer = new Map();

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("command", (command) => {
    console.log("Received command:", command);

    const buffer = commandBuffer.get(socket.id);
    if (command === "\r") {
      executeCommand(buffer, socket);
      commandBuffer.set(socket.id, "");
    } else {
      commandBuffer.set(socket.id, buffer ? buffer + command : command);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    commandBuffer.delete(socket.id);
  });
});

function executeCommand(command: string, socket: Socket) {
  console.log("Executing command:", command);

  if (!command) {
    return;
  }

  if (command === "exit") {
    socket.disconnect();
  }

  const childProcess = spawn(command, {
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  try {
    childProcess.stdout.on("data", (data) => {
      socket.emit("output", data.toString());
    });

    childProcess.stderr.on("data", (data) => {
      socket.emit("output", data.toString());
    });

    childProcess.on("close", (code) => {
      socket.emit("output", `$ /app `);
    });
  } catch (error) {
    console.error(error);
    socket.emit("output", `Error executing command: ${error}`);
  }
}

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
