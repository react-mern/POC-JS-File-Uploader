'use client';
import UploadManager from '@/utils/UploadManager';
import { useEffect } from 'react';

const UploadManagerInitializer = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.UploadManager) {
      window.UploadManager = new UploadManager({ max_uploads: 100 });
    }
  }, []);

  return null;
};

export default UploadManagerInitializer;
