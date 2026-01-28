import { useState, useRef, useEffect } from 'react';

/**
 * Hook to handle word selection via double-click and dictionary icon positioning
 */
const useDictionary = () => {
    const [selectedWord, setSelectedWord] = useState(null);
    const [iconPosition, setIconPosition] = useState({ top: 0, left: 0 });
    const [showIcon, setShowIcon] = useState(false);
    const containerRef = useRef(null);
    const timeoutRef = useRef(null);

    const handleDoubleClick = (e) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Get selected text
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (!text) {
            setShowIcon(false);
            return;
        }

        // Clean the word (remove punctuation, keep only letters and hyphens)
        const cleanedWord = text.replace(/[^\w\s-]/g, '').trim();

        if (!cleanedWord || cleanedWord.length < 2) {
            setShowIcon(false);
            return;
        }

        // Get the range and position
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
            // Calculate position relative to container
            const top = rect.bottom - containerRect.top + 5; // 5px below selection
            const left = rect.left - containerRect.left + rect.width / 2 - 12; // Center icon

            setSelectedWord(cleanedWord);
            setIconPosition({ top, left });
            setShowIcon(true);

            // Hide icon after 5 seconds if not clicked
            timeoutRef.current = setTimeout(() => {
                setShowIcon(false);
            }, 5000);
        }
    };

    const handleClickOutside = (e) => {
        // Hide icon if clicking outside
        if (showIcon && containerRef.current && !containerRef.current.contains(e.target)) {
            setShowIcon(false);
        }
    };

    useEffect(() => {
        if (showIcon) {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [showIcon]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const hideIcon = () => {
        setShowIcon(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    return {
        selectedWord,
        iconPosition,
        showIcon,
        containerRef,
        handleDoubleClick,
        hideIcon,
    };
};

export default useDictionary;
