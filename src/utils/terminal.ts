import { fork } from "node-pty";
import { Socket } from "socket.io";

const terminal = fork("bash", [], {
  name: "xterm-color",
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env,
});
export const createTerminal = (socket: Socket) => {
  socket.on("command", (command) => {
    terminal.write(command);
  });

  terminal.on("data", (data) => {
    socket.emit("output", data);
  });
};

export const killTerminal = () => {
  terminal.kill();
};
