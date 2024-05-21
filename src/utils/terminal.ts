import { fork } from "node-pty";
import { Socket } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

export const createTerminal = (socket: Socket) => {
  const terminal = fork("bash", [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: "../../code",
    env: process.env,
  });

  console.log(`Creating terminal for user ${socket.id}`);
  terminal.write("echo $USER@$HOSTNAME:$(pwd)\r");

  socket.on("command", (command) => {
    terminal.write(command);
  });

  terminal.on("data", (data: any) => {
    socket.emit("output", data);
  });

  console.log(`Terminal created for user ${socket.id}`);
  return terminal;
};

export const killTerminal = (terminal: any) => {
  if (terminal) {
    terminal.kill();
  }
};
