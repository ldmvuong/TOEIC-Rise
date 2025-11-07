/**
 * Component hiển thị image
 */
const ImageDisplay = ({ imageUrl, alt = 'Question' }) => {
  if (!imageUrl) return null;

  return (
    <div className="mb-6 flex justify-center">
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full max-h-96 object-contain rounded-lg border border-gray-200"
      />
    </div>
  );
};

export default ImageDisplay;

