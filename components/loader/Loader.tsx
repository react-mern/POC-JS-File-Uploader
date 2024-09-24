import React from 'react';

const Loader = () => {
  return (
    <div className="absolute inset-0 flex justify-center items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-gray-800"></div>
    </div>
  );
};

export default Loader;
