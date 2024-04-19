import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server, Socket } from "socket.io";
import { createTerminal } from "./terminal";

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
  createTerminal(socket)

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    commandBuffer.delete(socket.id);
  });
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
