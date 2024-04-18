import express from "express";
import dotenv from "dotenv";
import http from "http";
import { exec } from "child_process";
import { Server } from "socket.io";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ message: "Healthy!" });
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("execute-command", async (command) => {
    try {
      const child = exec(command);

      child.stdout?.on("data", (data) => {
        console.log(`stdout: ${data}`);
        socket.emit("command-output", { output: data });
      });

      child.stderr?.on("data", (data) => {
        console.log(`stderr: ${data}`);
        socket.emit("command-error", { error: data });
      });

      child.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
      });
    } catch (error) {
      console.error("Error executing command:", error);
      socket.emit("command-error", { error: "Error executing command" });
    }
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
