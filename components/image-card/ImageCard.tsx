'use client';
import Image from 'next/image';
import React, { useState } from 'react';
import Loader from '../loader/Loader';

const ImageCard = ({ src }: { src: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div className="flex justify-center relative w-full h-64">
      {isLoading && <Loader />}
      <Image
        src={src}
        alt={'Image'}
        fill
        className=" object-contain rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
        onLoadingComplete={() => setIsLoading(false)}
      />
    </div>
  );
};

export default ImageCard;
