import { fork } from "node-pty";
import { Socket } from "socket.io";

export const createTerminal = (socket: Socket) => {
  const terminal = fork("bash", [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env,
  });

  socket.on("command", (command) => {
    terminal.write(command);

   console.log("Command gone to backend ", command)
  });

  terminal.on("data", (data) => {
	  console.log("Terminal Got",data)
    socket.emit("output", data);
  });
};
