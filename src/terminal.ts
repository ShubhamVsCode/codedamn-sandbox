import pty from "node-pty";
import { Socket } from "socket.io";

export const createTerminal = (socket: Socket) => {
  const terminal = pty.spawn("bash", [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env,
  });

  socket.on("command", (command) => {
    terminal.write(command);
  });

  terminal.on("data", (data: string) => {
    socket.emit("output", data);
  });
};
