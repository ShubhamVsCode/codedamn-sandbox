import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Socket } from "socket.io";

dotenv.config();

const AWS_REGION = "ap-south-1";
const BUCKET_NAME = "codedamn-assignment";
export const HOME_DIR = process.env.HOME_DIR || "../../code";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const readDirectory = (dirPath: string) => {
  const files: any[] = [];
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      files.push({
        name: item.name,
        path: fullPath,
        isDir: true,
        children: readDirectory(fullPath),
      });
    } else {
      files.push({
        name: item.name,
        path: fullPath,
        isDir: false,
      });
    }
  });

  return files;
};

export const getFiles = async (userId: string, socket: Socket) => {
  const folder = `code-${userId}`;
  const files = await s3GetFiles(folder);

  const allFilesName = files?.map(({ Key }) => Key) || [];

  for (const file of allFilesName) {
    const relativeFilePath = file!.replace(`${folder}/`, "");
    const filePath = path.join(HOME_DIR, relativeFilePath);
    const params = {
      Bucket: BUCKET_NAME,
      Key: file,
    };

    const data = (await s3.send(new GetObjectCommand(params))).Body!;
    const fileContent = await data.transformToString("utf-8");

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, fileContent);
    console.log(`File ${filePath} downloaded successfully`);
  }

  const allFiles = allFilesName.map((file) => file?.split("/").pop());

  // socket.emit("allFiles", allFiles);
  getFileStructure(socket);
};

export const getFileStructure = async (socket: Socket) => {
  try {
    const rootDir = HOME_DIR;

    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    const fileStructure = readDirectory(rootDir);
    socket.emit("fileStructure", fileStructure);
  } catch (error) {
    console.error("Error reading file structure:", error);
    socket.emit("error", { message: error });
  }
};

const s3GetFiles = async (folder: string) => {
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: folder,
  };

  const { Contents } = await s3.send(new ListObjectsCommand(params));
  return Contents;
};

export const uploadFile = async (
  userId: string,
  fileName: string,
  fileContent: string,
) => {
  const folder = `code-${userId}`;
  const key = `${folder}/${fileName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentLength: fileContent.length,
  };

  if (fileName.startsWith("node_modules")) {
    return;
  }

  console.log(`Uploading file ${fileName} to folder ${folder}`);
  await s3.send(new PutObjectCommand(params));
};

export const addFile = async ({
  filePath,
  isDir,
}: {
  filePath: string;
  isDir: boolean;
}) => {
  try {
    const absolutePath = path.join(HOME_DIR, filePath);
    const dirPath = isDir ? absolutePath : path.dirname(absolutePath);
    fs.mkdirSync(dirPath, { recursive: true });
    if (!isDir) {
      fs.writeFileSync(absolutePath, "");
    }
  } catch (error) {
    console.error("Error adding file:", error);
  }
};

export const getFileContent = (filePath: string) => {
  try {
    const absolutePath = path.join(HOME_DIR, filePath);
    const data = fs.readFileSync(absolutePath, "utf8");
    return data;
  } catch (err) {
    console.log(`Error reading file: ${err}`);
  }
};

export const updateLocalInContainer = (
  filePath: string,
  fileContent: string,
) => {
  try {
    const absolutePath = path.join(HOME_DIR, filePath);
    fs.writeFileSync(absolutePath, fileContent);
  } catch (err) {
    console.log(`Error updating file: ${err}`);
    return;
  }
};

let changedFiles = new Set();

export const watchFiles = (socket: Socket) => {
  fs.watch(HOME_DIR, { recursive: true }, (eventType, filename) => {
    if (filename) {
      if (filename.startsWith("node_modules")) {
        return;
      }

      const filePath = path.join(HOME_DIR, filename);
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        changedFiles.add(filename);
      }
      socket.emit("fileChanged", { filename, eventType });
    }
  });
};

export const uploadAllChangedFiles = async (userId: string) => {
  console.log(`Uploading all changed files for user ${userId}`, changedFiles);
  for (const filename of changedFiles) {
    const filePath = path.join(HOME_DIR, filename as string);
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, "utf8");
      await uploadFile(userId, filename as string, content);
    }
  }
  changedFiles.clear();
};
