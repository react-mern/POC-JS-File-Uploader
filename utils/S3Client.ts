import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

// Configuration object for the S3 client
const s3Config: S3ClientConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET!,
  },
};

// Create and export a new S3 client instance
const s3Client = new S3Client(s3Config);

export default s3Client;
