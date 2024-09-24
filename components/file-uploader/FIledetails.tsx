import React, { useEffect, useState, useCallback } from 'react';
import { MdCancel } from 'react-icons/md';
import { IoCheckmarkDoneCircle } from 'react-icons/io5';
import { FiLoader } from "react-icons/fi";
import PreviewImage from '../preview-image/PreviewImage';
import { revalidateImages } from '@/utils/action';
import ConfirmDialog from '../confirmation-dialog/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import Loader from '../loader/Loader';

const FileDetails = ({ data, uploadHandler }) => {
  const [progress, setProgress] = useState(data.progress);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);

  const { toast } = useToast();

  // Memoize the upload listener to prevent unnecessary re-creations
  const uploadListener = useCallback(
    async (type, args) => {
      switch (type) {
        case 'ABORTED':
          setIsCanceled(true);
          toast({
            title: 'Upload cancelled!',
            variant: 'destructive',
          });
          break;
        case 'ERROR':
          uploadHandler('FAIL', data, args.progress);
          toast({
            title: 'Upload failed!',
            variant: 'destructive',
          });
          break;
        case 'DONE':
          uploadHandler('SUCCESS', data, args.progress);
          await revalidateImages();
          setIsUploaded(true);

          toast({
            title: 'Upload completed!',
            variant: 'default',
          });
          
          break;
        case 'PROGRESS':
          setProgress(args.progress);
          break;
      }
    },
    [data, uploadHandler]
  );

  useEffect(() => {
    const uploadListenerId = `upload:${data.id}`;

    // Add event listener for upload progress
    if (window.UploadManager) {
      window.UploadManager.EE.on(uploadListenerId, uploadListener);
    }

    // Clean up event listener on component unmount
    return () => {
      if (window.UploadManager) {
        window.UploadManager.EE.off(uploadListenerId, uploadListener);
      }
    };
  }, [data.id, uploadListener]);

  const onCancel = () => {
    window.UploadManager.cancel(data.id, true);
  };

  return (
    <div className="file-item">
      <PreviewImage src={data.file.preview || ''} />
      <span className="file-name">{data.file.name}</span>
      <div className="file-progress">
        <div
          className={`file-progress-bar ${isCanceled ? 'canceled' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {progress < 100 && !isCanceled && (
        <ConfirmDialog
          onClick={onCancel}
          description="Are you sure you want cancel this upload?"
          trigger={<MdCancel  className="abort-button" />}
        />
      )}
      {progress===100&& !isUploaded && <FiLoader className='uploading' />}
      {isUploaded && <IoCheckmarkDoneCircle className="mark-done" />}
    </div>
  );
};

export default FileDetails;
