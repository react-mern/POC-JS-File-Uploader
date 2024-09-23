import s3Client from '@/utils/S3Client';
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (request: NextRequest) => {
  try {
    const { file_name, parts } = await request.json();  
    const Key = `${crypto.randomUUID()}-${file_name}`;

    // Step 1: Initiate Multipart Upload
    const { UploadId } = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: process.env.AWS_BUCKET,
        Key
      })
    );

    // Step 2: Generate presigned URLs for each part
    const presignedUrls = await Promise.all(
      parts.map(async (part: { part_number: number }) => {
        const uploadPartCommand = new UploadPartCommand({
          Bucket: process.env.AWS_BUCKET,
          Key,
          PartNumber: part.part_number,
          UploadId,
        });
        
        const url = await getSignedUrl(s3Client, uploadPartCommand, {
          expiresIn: 900, // URL expires in 15 minutes
        });
        
        return { part_number: part.part_number, url };
      })
    );

    return NextResponse.json(
      {
        upload_id: UploadId,
        key_to_save: Key,
        presigned_urls: presignedUrls,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to initiate multipart upload' },
      { status: 500 }
    );
  }
};
