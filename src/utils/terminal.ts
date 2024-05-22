import { fork } from "node-pty";
import { Socket } from "socket.io";
import dotenv from "dotenv";
import { execSync } from "child_process";
dotenv.config();

const homeDir = process.env.HOME_DIR || "../../code";

// try {
//   execSync(`mkdir -p ${homeDir}`);
//   execSync(`chown -R user:user ${homeDir}`);
// } catch (error) {
//   console.error("Error setting up home directory:", error);
// }

export const createTerminal = (socket: Socket) => {
  const terminal = fork("bash", [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: homeDir,
    // env: {
    //   ...process.env,
    //   HOME: homeDir,
    //   USER: "user",
    // },
    uid: 1000,
    gid: 1000,
  });

  console.log(`Creating terminal for user ${socket.id}`);
  terminal.write("echo $USER@$HOSTNAME:$(pwd)\r");

  socket.on("command", (command) => {
    terminal.write(command);
  });

  terminal.on("data", (data: any) => {
    socket.emit("output", data);
  });

  socket.on("disconnect", () => {
    terminal.kill();
    console.log(`Terminal killed for user ${socket.id}`);
  });

  console.log(`Terminal created for user ${socket.id}`);
};

export const killTerminal = (terminal: any) => {
  if (terminal) {
    terminal.kill();
  }
};
