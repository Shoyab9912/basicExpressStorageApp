import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import client from "../config/s3.js";

export const createSignedUrl = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: 300,
    signableHeaders: new Set(["content-type"]),
  });

  return url;
};

export const createGetSignedUrl = async ({
  key,
  download = false,
  fileName,
}) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(fileName)}"`,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: 600,
  });
  return url;
};

export const getFileMetaData = async (key) => {
  const command = new HeadObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  const data = await client.send(command);

  return data;
};

export const deleteResource = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
};

export const deleteResources = async (keys) => {
  const command = new DeleteObjectsCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Delete: {
      Objects: keys,
    },
  });

  await client.send(command);
};
