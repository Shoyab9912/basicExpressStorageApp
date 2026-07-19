import {S3Client,PutObjectCommand} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({profile:"nodejs"})


export const createSignedUrl = async ({key,contentType}) => {
 
    const command = new PutObjectCommand({
        Bucket:"deadly-storage-dev",
        Key:key,
        ContentType : contentType
    })

    const url = await getSignedUrl(client,command,{
        expiresIn:300,
        signableHeaders:new Set(["content-type"])
    })

    return url

} 