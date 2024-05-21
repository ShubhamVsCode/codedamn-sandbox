import fs from "fs";
import { uploadAllChangedFiles } from "./files";

const idleThreshold = 30000;
let lastActiveTime = Date.now();

const getCpuUsage = () => {
  const cpuUsageFile = "/sys/fs/cgroup/cpu/cpuacct.usage";
  const cpuUsage = fs.readFileSync(cpuUsageFile, "utf8");
  return parseInt(cpuUsage, 10);
};

const getNetworkStats = () => {
  const netDevFile = "/proc/net/dev";
  const netData = fs.readFileSync(netDevFile, "utf8");
  const lines = netData.split("\n");
  const ethLine = lines.find((line) => line.includes("eth0"));
  const stats = ethLine?.trim().split(/\s+/);
  return {
    rxBytes: parseInt(stats?.[1] || "0", 10),
    txBytes: parseInt(stats?.[9] || "0", 10),
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
