import { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Tag, Button, Spin, Empty, message } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { getAllTags } from '@/api/api';

const TagsSelector = ({ value = [], onChange }) => {
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const observerRef = useRef(null);
    const lastTagElementRef = useCallback((node) => {
        if (loading) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && page < totalPages - 1) {
                setPage((prev) => prev + 1);
            }
        });
        if (node) observerRef.current.observe(node);
    }, [loading, hasMore, page, totalPages]);

    // Debounce search text
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchText);
            setPage(0); // Reset page when search changes
            setTags([]); // Clear tags when search changes
        }, 300);

        return () => clearTimeout(timer);
    }, [searchText]);

    // Fetch tags
    useEffect(() => {
        const fetchTags = async () => {
            if (!dropdownOpen) return;

            setLoading(true);
            try {
                const queryParams = new URLSearchParams();
                queryParams.append('page', page.toString());
                queryParams.append('size', '5');
                if (debouncedSearch.trim()) {
                    queryParams.append('tagName', debouncedSearch.trim());
                }

                const response = await getAllTags(queryParams.toString());
                const data = response?.data;

                if (data) {
                    const newTags = data.result || [];
                    if (page === 0) {
                        setTags(newTags);
                    } else {
                        setTags((prev) => [...prev, ...newTags]);
                    }

                    setTotalPages(data.meta?.pages || 0);
                    setHasMore(page < (data.meta?.pages || 0) - 1);
                }
            } catch (error) {
                console.error('Error fetching tags:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTags();
    }, [debouncedSearch, page, dropdownOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAddTag = (tag) => {
        // Check if tag already exists (by id or name)
        const exists = value.some((t) => t.id === tag.id || t.name === tag.name);
        if (!exists) {
            const newValue = [...value, tag];
            onChange?.(newValue);
        } else {
            // Tag already exists, show message
            message.warning('Tag này đã được chọn');
        }
        setSearchText('');
        setDropdownOpen(false);
    };

    const handleRemoveTag = (tagId) => {
        const newValue = value.filter((t) => t.id !== tagId);
        onChange?.(newValue);
    };

    const handleSearchChange = (e) => {
        setSearchText(e.target.value);
        setDropdownOpen(true);
    };

    const handleSearchFocus = () => {
        setDropdownOpen(true);
    };

    // Filter out already selected tags from dropdown (check both id and name)
    const availableTags = tags.filter(
        (tag) => !value.some((selectedTag) => 
            selectedTag.id === tag.id || selectedTag.name === tag.name
        )
    );

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">
                Tags <span className="text-red-500">*</span>
            </div>

            {/* Selected Tags Section */}
            <div>
                <div className="text-xs text-gray-500 mb-1.5">Tags đã chọn:</div>
                <div className="min-h-[70px] p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                    {value.length === 0 ? (
                        <div className="text-xs text-gray-400 text-center py-4">
                            Chưa có tag nào được chọn
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {value.map((tag) => (
                                <Tag
                                    key={tag.id}
                                    closable
                                    onClose={() => handleRemoveTag(tag.id)}
                                    color="blue"
                                    className="text-xs py-0.5 px-2 m-0"
                                >
                                    {tag.name}
                                </Tag>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Section */}
            <div className="relative" ref={dropdownRef}>
                <div className="text-xs text-gray-500 mb-1.5">Tìm kiếm và thêm tag:</div>
                <Input
                    placeholder="Nhập tên tag để tìm kiếm..."
                    value={searchText}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    allowClear
                />

                {/* Dropdown */}
                {dropdownOpen && (
                    <div className="absolute z-10 w-full mt-1.5 bg-white border border-gray-200 rounded-md shadow-xl max-h-[240px] overflow-y-auto">
                            {loading && page === 0 ? (
                                <div className="p-3 text-center">
                                    <Spin size="small" />
                                </div>
                            ) : availableTags.length === 0 ? (
                                <div className="p-3">
                                    <Empty
                                        description={
                                            <span className="text-xs text-gray-500">
                                                {debouncedSearch.trim()
                                                    ? 'Không tìm thấy tag nào'
                                                    : 'Nhập từ khóa để tìm kiếm'}
                                            </span>
                                        }
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="py-1">
                                        {availableTags.map((tag, index) => {
                                            if (index === availableTags.length - 1) {
                                                return (
                                                    <div
                                                        key={tag.id}
                                                        ref={lastTagElementRef}
                                                        className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors border-b border-gray-100 last:border-b-0"
                                                        onClick={() => handleAddTag(tag)}
                                                    >
                                                        <span className="text-xs text-gray-700">{tag.name}</span>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<PlusOutlined />}
                                                            className="text-blue-600 hover:text-blue-700 h-6 w-6 p-0 flex items-center justify-center"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddTag(tag);
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div
                                                    key={tag.id}
                                                    className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors border-b border-gray-100"
                                                    onClick={() => handleAddTag(tag)}
                                                >
                                                    <span className="text-xs text-gray-700">{tag.name}</span>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        className="text-blue-600 hover:text-blue-700 h-6 w-6 p-0 flex items-center justify-center"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddTag(tag);
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {loading && page > 0 && (
                                        <div className="p-2 text-center border-t border-gray-100">
                                            <Spin size="small" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                )}
            </div>

            {/* Validation message */}
            {value.length === 0 && (
                <div className="text-xs text-red-500 mt-1">
                    Vui lòng chọn ít nhất một tag
                </div>
            )}
        </div>
    );
};

export default TagsSelector;

