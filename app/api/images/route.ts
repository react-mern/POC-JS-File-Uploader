import s3Client from '@/utils/S3Client';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = async () => {
  try {
    const client = s3Client;
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET,
    });

    const response = await client.send(command);

    // Filter to get only image files and Sort by LastModified in descending order (newest first)
    const images = response?.Contents?.filter((item) => {
      const key = item.Key?.toLowerCase();
      return (
        key?.endsWith('.jpg') ||
        key?.endsWith('.jpeg') ||
        key?.endsWith('.png') ||
        key?.endsWith('.gif')
      );
    }).sort((a, b) => {
      return (
        (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
      );
    });

    // Generate presigned URLs for each image
    const imageUrls = images?.map(
      (image) =>
        `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${image.Key}`
    );
    

    return NextResponse.json({ imageUrls }, { status: 200 });
  } catch (error) {
   
    return NextResponse.json(
      { message: (error as { message: string }).message },
      { status: 400 }
    );
  }
};
