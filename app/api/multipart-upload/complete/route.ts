import s3Client from '@/utils/S3Client';
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (request: NextRequest) => {
  const { key_to_save, upload_id, parts } = await request.json();

  try {
    // Step 3: Complete Multipart Upload
    const completeMultipartUploadCommand =  new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key_to_save,
      UploadId: upload_id,
      MultipartUpload: {
        Parts: parts.map((part: { etag: string; part_number: number }) => ({
          ETag: part.etag,
          PartNumber: part.part_number,
        })),
      },
    })
    const completeResponse = await s3Client.send(
      completeMultipartUploadCommand
    );

    return NextResponse.json(
      {
        message: 'Upload complete',
        location: completeResponse.Location,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
        { message: 'Failed to complete multipart upload' },
        { status: 500 }
      );
  }
};
