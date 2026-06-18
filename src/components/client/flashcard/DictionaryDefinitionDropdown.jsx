import React, { useEffect, useRef } from "react";
import { Spin } from "antd";

const DictionaryDefinitionDropdown = ({
  visible,
  loading,
  word,
  options,
  onSelect,
  onClose,
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const container = dropdownRef.current.parentElement;
        if (container && container.contains(event.target)) {
          return;
        }
        if (onClose) {
          onClose();
        }
      }
    };

    if (visible || loading) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, loading, onClose]);

  if (!visible && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div
        ref={dropdownRef}
        className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md"
      >
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Spin size="small" />
          <span>Looking up dictionary...</span>
        </div>
      </div>
    );
  }

  if (!options?.length) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
        Select a definition{word ? ` for "${word}"` : ""}
      </div>
      <ul className="py-1">
        {options.map((option, optionIndex) => (
          <li key={optionIndex}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option)}
            >
              <div className="flex flex-wrap items-center gap-2">
                {option.pos && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                    {option.pos}
                  </span>
                )}
                {option.definitionLang && (
                  <span className="text-[10px] uppercase text-gray-400">
                    {option.definitionLang}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-800 leading-snug">
                {option.definition}
              </p>
              {option.example && (
                <p className="mt-1 text-xs italic text-gray-500 line-clamp-2">
                  {option.example}
                </p>
              )}
              {option.source && (
                <p className="mt-1 text-[10px] text-gray-400">
                  {option.source}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DictionaryDefinitionDropdown;
