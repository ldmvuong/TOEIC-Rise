import { useCallback, useEffect, useRef, useState } from 'react';

export const DICT_API_BASE_URL = 'https://dict.minhqnd.com';
const LOOKUP_DEBOUNCE_MS = 300;

export const parseDictionaryLookupResponse = (data, baseUrl = DICT_API_BASE_URL) => {
    if (!data?.exists || !Array.isArray(data.results) || data.results.length === 0) {
        return null;
    }

    const firstResult = data.results[0];
    const pronunciation =
        Array.isArray(firstResult.pronunciations) && firstResult.pronunciations.length > 0
            ? firstResult.pronunciations[0]?.ipa || ''
            : '';

    const audioPath = firstResult.audio || '';
    const audioUrl =
        audioPath && typeof audioPath === 'string'
            ? (audioPath.startsWith('http') ? audioPath : `${baseUrl}${audioPath}`)
            : '';

    const options = [];
    data.results.forEach((result) => {
        if (!Array.isArray(result.meanings)) return;

        result.meanings.forEach((meaning) => {
            const definition = meaning?.definition?.trim();
            if (!definition) return;

            options.push({
                definition,
                pos: meaning.pos || '',
                example: meaning.example || '',
                source: meaning.source || '',
                definitionLang: meaning.definition_lang || result.lang_code || '',
                pronunciation,
                audioUrl,
            });
        });
    });

    if (options.length === 0) return null;

    return {
        word: data.word || '',
        options,
        pronunciation,
        audioUrl,
    };
};

const useFlashcardDictionaryLookup = (items, setItems) => {
    const lookupTimeoutsRef = useRef({});
    const lookupSeqRef = useRef({});
    const resolvedVocabRef = useRef({});
    const itemsRef = useRef(items);
    const [lookupSuggestions, setLookupSuggestions] = useState({});
    const [lookupLoadingByIndex, setLookupLoadingByIndex] = useState({});

    itemsRef.current = items;

    useEffect(() => {
        return () => {
            Object.values(lookupTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
            lookupTimeoutsRef.current = {};
        };
    }, []);

    const clearSuggestions = useCallback((index) => {
        setLookupSuggestions((prev) => {
            if (!prev[index]) return prev;
            const next = { ...prev };
            delete next[index];
            return next;
        });
        setLookupLoadingByIndex((prev) => {
            if (!prev[index]) return prev;
            const next = { ...prev };
            delete next[index];
            return next;
        });
    }, []);

    const setLoadingForIndex = useCallback((index, loading) => {
        setLookupLoadingByIndex((prev) => {
            if (loading) {
                return { ...prev, [index]: true };
            }
            if (!prev[index]) return prev;
            const next = { ...prev };
            delete next[index];
            return next;
        });
    }, []);

    const handleLookupFromDictionary = useCallback(async (index, vocabOverride) => {
        const vocab = (vocabOverride ?? itemsRef.current[index]?.vocabulary ?? '').trim();
        if (!vocab) {
            delete resolvedVocabRef.current[index];
            clearSuggestions(index);
            return;
        }

        const normalizedVocab = vocab.toLowerCase();
        const currentDefinition = (itemsRef.current[index]?.definition ?? '').trim();
        const resolvedVocab = resolvedVocabRef.current[index];
        if (resolvedVocab === normalizedVocab && currentDefinition) {
            clearSuggestions(index);
            return;
        }

        const seq = (lookupSeqRef.current[index] ?? 0) + 1;
        lookupSeqRef.current[index] = seq;
        setLoadingForIndex(index, true);

        try {
            const response = await fetch(
                `${DICT_API_BASE_URL}/api/v1/lookup?lang=en&word=${encodeURIComponent(normalizedVocab)}`
            );

            const latestSeq = lookupSeqRef.current[index];
            const stillLatest = latestSeq === seq;
            const currentVocab = (itemsRef.current[index]?.vocabulary ?? '').trim().toLowerCase();
            const stillSameVocab = currentVocab === normalizedVocab;

            if (!stillLatest || !stillSameVocab) return;

            if (!response.ok) {
                clearSuggestions(index);
                return;
            }

            const data = await response.json();

            if (data?.exists === false) {
                clearSuggestions(index);
                return;
            }

            const parsed = parseDictionaryLookupResponse(data);
            if (!parsed) {
                clearSuggestions(index);
                return;
            }

            setLookupSuggestions((prev) => ({
                ...prev,
                [index]: parsed,
            }));
        } catch (error) {
            console.error('Error looking up dictionary:', error);
            clearSuggestions(index);
        } finally {
            if (lookupSeqRef.current[index] === seq) {
                setLoadingForIndex(index, false);
            }
        }
    }, [clearSuggestions, setLoadingForIndex]);

    const scheduleLookup = useCallback((index, vocabValue) => {
        const trimmed = (vocabValue ?? '').trim();
        if (!trimmed) {
            delete resolvedVocabRef.current[index];
            const existing = lookupTimeoutsRef.current[index];
            if (existing) {
                clearTimeout(existing);
                delete lookupTimeoutsRef.current[index];
            }
            clearSuggestions(index);
            return;
        }

        const normalizedVocab = trimmed.toLowerCase();
        if (resolvedVocabRef.current[index] !== normalizedVocab) {
            delete resolvedVocabRef.current[index];
        }

        const existing = lookupTimeoutsRef.current[index];
        if (existing) clearTimeout(existing);

        lookupTimeoutsRef.current[index] = setTimeout(() => {
            handleLookupFromDictionary(index, vocabValue);
        }, LOOKUP_DEBOUNCE_MS);
    }, [handleLookupFromDictionary, clearSuggestions]);

    const flushLookup = useCallback((index, vocabValue) => {
        const existing = lookupTimeoutsRef.current[index];
        if (existing) {
            clearTimeout(existing);
            delete lookupTimeoutsRef.current[index];
        }
        handleLookupFromDictionary(index, vocabValue);
    }, [handleLookupFromDictionary]);

    const applySuggestion = useCallback((index, option) => {
        const currentVocab = (itemsRef.current[index]?.vocabulary ?? '').trim().toLowerCase();
        if (currentVocab) {
            resolvedVocabRef.current[index] = currentVocab;
        }
        setItems((prevItems) => {
            const newItems = [...prevItems];
            const current = { ...newItems[index] };
            current.definition = option.definition || '';
            if (option.pronunciation) {
                current.pronunciation = option.pronunciation;
            }
            if (option.audioUrl) {
                current.audioUrl = option.audioUrl;
            }
            newItems[index] = current;
            return newItems;
        });
        clearSuggestions(index);
    }, [setItems, clearSuggestions]);

    const cleanupLookupForIndex = useCallback((index) => {
        const existing = lookupTimeoutsRef.current[index];
        if (existing) {
            clearTimeout(existing);
            delete lookupTimeoutsRef.current[index];
        }
        delete resolvedVocabRef.current[index];
        clearSuggestions(index);
    }, [clearSuggestions]);

    return {
        lookupSuggestions,
        lookupLoadingByIndex,
        scheduleLookup,
        flushLookup,
        applySuggestion,
        clearSuggestions,
        cleanupLookupForIndex,
    };
};

export default useFlashcardDictionaryLookup;
