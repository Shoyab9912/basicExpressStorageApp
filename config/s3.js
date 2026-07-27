import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({ profile: "nodejs", region: "ap-south-2" });

export const createSignedUrl = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: "deadly-storage-dev",
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
    Bucket: "deadly-storage-dev",
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
    Bucket: "deadly-storage-dev",
    Key: key,
  });

  const data = await client.send(command)

  return data
};


export const deleteResource = async (key) => {
   const command = new DeleteObjectCommand({
    Bucket: "deadly-storage-dev",
    Key: key,
  });

  await client.send(command)
}



export const deleteResources = async (keys) => {
   const command = new DeleteObjectsCommand({
    Bucket: "deadly-storage-dev",
    Delete: {
      Objects: keys
    }
  });

  await client.send(command)
}