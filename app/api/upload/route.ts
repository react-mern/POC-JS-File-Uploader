import { NextRequest, NextResponse } from 'next/server';
import { Upload } from '@aws-sdk/lib-storage';
import s3Client from '@/utils/S3Client';


export const POST = async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    const Key = `${crypto.randomUUID()}-${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());



    // Upload to S3
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_BUCKET,
        Key,
        Body: fileBuffer,
        ContentType: file.type,
      },
      leavePartsOnError: false,
    });

    upload.on('httpUploadProgress', (progress) => {
      const percentage = (progress.loaded! / progress.total!) * 100;
    });

    await upload.done();

    return NextResponse.json({ message: 'Upload completed' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: `Internal server error ${error.message}` },
      { status: 500 }
    );
  }
};
