import fs from "fs";
import { uploadAllChangedFiles } from "./files";

const idleThreshold = 30000;
let lastActiveTime = Date.now();

const getCpuUsage = () => {
  const cpuStatFile = "/sys/fs/cgroup/cpu.stat";
  if (fs.existsSync(cpuStatFile)) {
    const cpuStat = fs.readFileSync(cpuStatFile, "utf8");
    const usageMatch = cpuStat.match(/usage_usec (\d+)/);
    if (usageMatch) {
      return parseInt(usageMatch[1], 10);
    }
  }
  console.log("CPU usage file not found or format incorrect");
  return 0;
};

const getNetworkStats = () => {
  const netDevFile = "/proc/net/dev";
  const netData = fs.readFileSync(netDevFile, "utf8");
  const lines = netData.split("\n");
  const ethLine = lines.find(
    (line) => line.includes("eth0") || line.includes("ens"),
  );

  if (ethLine) {
    const stats = ethLine.trim().split(/\s+/);
    return {
      rxBytes: parseInt(stats[1], 10),
      txBytes: parseInt(stats[9], 10),
    };
  }

  console.log("Network interface not found");
  return {
    rxBytes: 0,
    txBytes: 0,
  };
};

export const monitorContainer = async (userId: string) => {
  try {
    const cpuUsage = getCpuUsage();
    const { rxBytes, txBytes } = getNetworkStats();

    const isIdle = cpuUsage === 0 && rxBytes === 0 && txBytes === 0;

    if (isIdle) {
      const currentTime = Date.now();
      if (currentTime - lastActiveTime > idleThreshold) {
        console.log("Container is idle. Initiating backup...");
        uploadAllChangedFiles(userId);
        console.log("Backup completed and uploaded to S3.");
      }
    } else {
      lastActiveTime = Date.now();
    }
  } catch (error) {
    console.error("Error monitoring container:", error);
  }
};
