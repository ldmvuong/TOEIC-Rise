import { useEffect, useState } from 'react';
import { Modal, List, Spin, Empty, message, Tag, Tooltip } from 'antd';
import { callFetchFlashcardsForPopup, callAddFlashcardItemToPopup } from '../../../api/api';

const DICT_API_BASE_URL = 'https://dict.minhqnd.com';

const AddToFlashcardModal = ({ open, onClose, word }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const resetState = () => {
    setFlashcards([]);
    setPage(0);
    setHasMore(true);
    setLoading(false);
    setAddingId(null);
  };

  const loadPage = async (pageToLoad) => {
    // Guard against parallel loads; rely on current state value
    if (loading) return;
    setLoading(true);
    try {
      const res = await callFetchFlashcardsForPopup({
        page: pageToLoad,
        size: pageSize,
      });

      const data = res?.data || {};
      const items = data.result || [];
      const meta = data.meta || {};

      setFlashcards((prev) =>
        pageToLoad === 0 ? items : [...prev, ...items.filter((item) => !prev.some((p) => p.id === item.id))],
      );

      const totalPages = meta.pages ?? (meta.total && meta.pageSize ? Math.ceil(meta.total / meta.pageSize) : 0);
      setHasMore(totalPages ? pageToLoad + 1 < totalPages : items.length === pageSize);
      setPage(pageToLoad);
    } catch (error) {
      console.error('Error fetching flashcards for popup:', error);
      message.error(error?.message || 'Unable to load flashcard list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      resetState();
      loadPage(0);
    } else {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40 && hasMore && !loading) {
      loadPage(page + 1);
    }
  };

  const handleSelectFlashcard = async (flashcard) => {
    if (!word || !flashcard?.id) return;
    if (addingId) return;

    try {
      setAddingId(flashcard.id);

      // 1. Tra cứu từ điển để lấy definition, pronunciation, audioUrl
      const vocab = word.trim().toLowerCase();
      const response = await fetch(
        `${DICT_API_BASE_URL}/api/v1/lookup?word=${encodeURIComponent(vocab)}`,
      );

      if (!response.ok) {
        // Nếu 404 hoặc lỗi khác: chỉ hiển thị message, KHÔNG gọi backend
        if (response.status === 404) {
          message.error('No meaning found for this word.');
        } else {
          message.error('Unable to look up this word before adding it to a flashcard.');
        }
        return;
      }

      const dictData = await response.json();

      if (!dictData?.exists || !Array.isArray(dictData.results) || dictData.results.length === 0) {
        message.error('No meaning found for this word.');
        return;
      }

      const firstResult = dictData.results[0];

      const pronunciation =
        Array.isArray(firstResult.pronunciations) && firstResult.pronunciations.length > 0
          ? firstResult.pronunciations[0].ipa || ''
          : '';

      const allDefinitions = Array.isArray(firstResult.meanings)
        ? firstResult.meanings
            .map((m) => m?.definition?.trim())
            .filter(Boolean)
        : [];
      const definition = allDefinitions.join('; ');
      if (!definition) {
        message.error('No valid definition found for this word.');
        return;
      }

      const audioPath = firstResult.audio || '';
      const audioUrl =
        audioPath && typeof audioPath === 'string'
          ? audioPath.startsWith('http')
            ? audioPath
            : `${DICT_API_BASE_URL}${audioPath}`
          : '';

      const payload = {
        flashcardId: flashcard.id,
        vocabulary: word,
        definition,
        audioUrl,
        pronunciation,
      };

      // 2. Gửi request thêm item vào flashcard
      const res = await callAddFlashcardItemToPopup(payload);
      if (res && res.status >= 200 && res.status < 300) {
        message.success(`Added "${word}" to "${flashcard.name}".`);
        onClose?.();
      } else {
        message.error('Unable to add this word to a flashcard.');
      }
    } catch (error) {
      console.error('Error adding word to flashcard:', error);
      message.error(error?.message || 'Unable to add this word to a flashcard.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">Add word to flashcard</span>
          {word && (
            <Tooltip title="Word being added to a flashcard">
              <Tag color="blue" className="text-xs">
                {word}
              </Tag>
            </Tooltip>
          )}
        </div>
      }
    >
      <div className="space-y-3">

        <div
          style={{ maxHeight: '50vh', overflowY: 'auto' }}
          onScroll={handleScroll}
        >
          {loading && flashcards.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <Spin />
            </div>
          ) : flashcards.length === 0 ? (
            <div className="py-6">
              <Empty description="You do not have any flashcard sets yet" />
            </div>
          ) : (
            <List
              dataSource={flashcards}
              renderItem={(item) => (
                <Tooltip title="Click to add this word to the flashcard set">
                  <List.Item
                    key={item.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors rounded-md px-3"
                    onClick={() => handleSelectFlashcard(item)}
                  >
                    <List.Item.Meta
                      title={
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{item.name}</span>
                          <span className="text-xs text-gray-500">
                            {item.itemCount ?? 0} words
                          </span>
                        </div>
                      }
                      description={
                        <span className="text-xs text-gray-500">
                          {item.description || 'No description'}
                        </span>
                      }
                    />
                  </List.Item>
                </Tooltip>
              )}
            />
          )}

          {loading && flashcards.length > 0 && (
            <div className="flex justify-center items-center py-3">
              <Spin size="small" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddToFlashcardModal;

