import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const AWS_REGION = "ap-south-1";
const BUCKET_NAME = "codedamn-assignment";
const HOME = "../../code";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const getFiles = async (userId: string) => {
  const folder = `code-${userId}`;
  const files = await s3GetFiles(folder);
  console.log(`Files in folder ${folder}:`, files);
  return files;
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
    ContentLength: fileContent.length
  };

  console.log(`Uploading file ${fileName} to folder ${folder}`);
  await s3.send(new PutObjectCommand(params));
};

export const createFileInContainer = async (filePath: string) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(HOME + filePath, "", (err: unknown) => {
      if (err) {
        reject(err);
      } else {
        resolve("");
      }
    });
  });
};
