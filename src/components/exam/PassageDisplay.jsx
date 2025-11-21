import parse from 'html-react-parser';

/**
 * Component hiển thị passage (đoạn văn)
 */
const PassageDisplay = ({ passage }) => {
  if (!passage) return null;

  return (
    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
      <div className="text-gray-800 text-sm leading-relaxed">
        {parse(passage)}
      </div>
    </div>
  );
};

export default PassageDisplay;

