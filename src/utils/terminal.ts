import { fork } from "node-pty";
import { Socket } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

const terminal = fork("bash", [], {
  name: "xterm-color",
  cols: 80,
  rows: 30,
  cwd: "../../code",
  env: process.env,
});

export const createTerminal = (socket: Socket) => {
  terminal.write("echo $USER@$HOSTNAME:$(pwd)\r");

  socket.on("command", (command) => {
    terminal.write(command);
  });

  terminal.on("data", (data: any) => {
    socket.emit("output", data);
  });
};

export const killTerminal = () => {
  terminal.kill();
};
