import React, { useEffect, useState } from 'react';

const PreviewImage = ({ src }: { src: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src || '');

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setLoading(false);
      setImageSrc(src);
    };
    
    img.onerror = () => {
      setLoading(false);
      setError(true);
      setImageSrc('');
    };

    img.src = src || '';

    // Cleanup function to prevent memory leaks
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (loading) {
    return <div>Loading ...</div>;
  }

  if (error) {
    return <div>Error loading image</div>;
  }

  return <img src={imageSrc} alt="Preview" height={24} width={24} />;
};

export default PreviewImage;
