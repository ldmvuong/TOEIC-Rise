export const formatCharCount = (value, max) => {
  const current = value?.length ?? 0;
  const safeMax = Number.isFinite(Number(max)) ? Number(max) : 0;
  return `${current.toLocaleString()}/${safeMax.toLocaleString()}`;
};

export const CharCount = ({ value, max, className = "" }) => (
  <div className={`mt-1 text-xs text-gray-500 text-right ${className}`}>
    {formatCharCount(value, max)}
  </div>
);

