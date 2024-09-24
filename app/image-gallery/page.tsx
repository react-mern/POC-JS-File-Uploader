import ImageCard from '@/components/image-card/ImageCard';

const ImageGallery = async () => {
  const fetchImages = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/images`,
        {
          next: {
            tags: ['images'],
          },
        }
      );
      const data = await response.json();
      return data.imageUrls;
    } catch (error) {
      return [];
    }
  };

  const images = await fetchImages();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        Image Gallery
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-h-[70vh] overflow-auto">
        {images?.length > 0 ? (
          images.map((image, index) => {
           return <ImageCard key={index} src={image} />;
          })
        ) : (
          <p className="col-span-full text-center text-xl text-gray-600">
            No images found
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageGallery;
