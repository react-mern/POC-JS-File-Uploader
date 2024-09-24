'use client';
import React, { useState, useCallback } from 'react';
import Dropzone, { FileRejection } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { MdRefresh } from 'react-icons/md';
import ConfirmDialog from '../confirmation-dialog/ConfirmDialog';
import FileDetails from './FIledetails';
import { useToast } from '@/hooks/use-toast';

interface FileMetadata extends File {
  preview: string;
}

interface UploadFile {
  id: string;
  file: FileMetadata;
  progress: number;
}

type UploadStatus = 'SUCCESS' | 'FAIL' | 'CANCEL';

const FileUploader = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [error, setError] = useState('');
  const UNIQUE_ID = uuidv4();
  const { toast } = useToast();

  const uploadHandler = useCallback(
    (type: UploadStatus, currentFile: UploadFile, progress: number) => {
      if (type === 'SUCCESS') {
        setFiles((prevState) =>
          prevState.map((file) =>
            file.id === currentFile.id ? { ...file, progress } : file
          )
        );
      } else if (type === 'CANCEL') {
        setFiles((prevState) =>
          prevState.filter((file) => file.id !== currentFile.id)
        );
      }
    },
    []
  );

  const upload = useCallback(
    (file: FileMetadata) => {
      const isLargeFile = file.size > 5 * 1024 * 1024;
      window.UploadManager.uploadFile({
        id: `${file.name}-${UNIQUE_ID}`,
        url: `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
        file,
        origin: 'connect',
        multipart: isLargeFile,
      });
    },
    [UNIQUE_ID]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        setError(rejectedFiles[0].errors[0].message);
        toast({
          title: rejectedFiles[0].errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      if (acceptedFiles.length <= 0) return;

      const newFiles = acceptedFiles.map((file) => ({
        id: `${file.name}-${UNIQUE_ID}`,
        file: Object.assign(file, { preview: URL.createObjectURL(file) }),
        progress: 0,
      }));

      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      newFiles.forEach(({ file }) => upload(file as FileMetadata));
      setError('');
    },
    [UNIQUE_ID, upload]
  );

  const refreshFileList = () => {
    window.UploadManager.cancelAll();
    setFiles([]);
  };

  return (
    <div className="max-w-[80%] mx-auto my-5">
      <Dropzone onDrop={onDrop} accept={{ 'image/jpeg': [], 'image/png': [] }}>
        {({ getRootProps, getInputProps }) => (
          <Card className="border border-dashed border-gray-300 flex justify-center items-center h-[200px] hover:bg-gray-100 cursor-grab">
            <CardContent
              {...getRootProps()}
              className="flex justify-center items-center p-5 max-w-[90%]"
            >
              Drop your files here, or click to select files
            </CardContent>
          </Card>
        )}
      </Dropzone>

      <Separator className="my-5" />

      <div className="flex flex-col gap-[20px] max-h-[400px]">
        <div className="flex justify-between">
          <h3>Uploaded Files</h3>
          <ConfirmDialog
            onClick={refreshFileList}
            description="This action will cancel all ongoing uploads. Are you sure you want to refresh?"
            trigger={<MdRefresh className="refresh-button" />}
          />
        </div>
        {files.length === 0 ? (
          <div
            className="flex flex-col justify-center items-center h-[200px] border border-dashed border-gray-300 rounded-lg
          "
          >
            <p>No files in recent uploads.</p>
            <p>Your latest uploads will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {files.map((data) => (
              <FileDetails
                key={data.id}
                data={data}
                uploadHandler={uploadHandler}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
