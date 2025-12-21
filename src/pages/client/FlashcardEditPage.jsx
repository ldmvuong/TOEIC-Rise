import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Switch, Button, message, Spin, Card, Tooltip } from 'antd';
import { 
    ArrowLeftOutlined, 
    SaveOutlined, 
    PlusOutlined, 
    DeleteOutlined, 
    GlobalOutlined, 
    LockOutlined 
} from '@ant-design/icons';
import { 
    callFetchFlashcardDetail, 
    callUpdateFlashcard 
} from '../../api/api';

const { TextArea } = Input;

const FlashcardEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNotFound, setIsNotFound] = useState(false); // Lỗi 404 - không tìm thấy hoặc không có quyền
    const [isOwner, setIsOwner] = useState(false); // Quyền sở hữu - từ API

    // --- STATE DỮ LIỆU ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [items, setItems] = useState([
        { vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }
    ]);

    // --- STATE VALIDATION ---
    const [errors, setErrors] = useState({
        name: '',
        items: []
    });

    // --- FETCH DATA ---
    useEffect(() => {
        if (id) {
            fetchFlashcardData();
        }
    }, [id]);

    const fetchFlashcardData = async () => {
        setIsLoading(true);
        setIsNotFound(false);
        try {
            const res = await callFetchFlashcardDetail(id);
            if (res && res.data) {
                const data = res.data;
                // Check quyền sở hữu - nếu không phải owner thì hiển thị 404
                const ownerStatus = data.isOwner ?? false;
                setIsOwner(ownerStatus);
                
                if (!ownerStatus) {
                    setIsNotFound(true);
                    setIsLoading(false);
                    return;
                }
                
                setName(data.name || '');
                setDescription(data.description || '');
                setIsPublic(data.accessType === 'PUBLIC');
                // Map dữ liệu items từ BE về form
                if (data.items && data.items.length > 0) {
                    setItems(data.items.map(item => ({
                        vocabulary: item.vocabulary || item.word || '',
                        definition: item.definition || '',
                        pronunciation: item.pronunciation || '',
                        audioUrl: item.audioUrl || ''
                    })));
                    // Initialize errors array
                    setErrors({
                        name: '',
                        items: data.items.map(() => ({ vocabulary: '', definition: '' }))
                    });
                } else {
                    setItems([{ vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }]);
                    setErrors({
                        name: '',
                        items: [{ vocabulary: '', definition: '' }]
                    });
                }
            }
        } catch (error) {
            console.error(error);
            // Nếu là lỗi 404 (không tìm thấy hoặc không có quyền truy cập)
            if (error?.statusCode === 404) {
                setIsNotFound(true);
            } else {
                // Các lỗi khác vẫn hiển thị message và navigate
                message.error(error?.message || "Không thể tải thông tin bộ thẻ!");
                navigate(`/flashcards/${id}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- CÁC HÀM XỬ LÝ FORM ---
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
        
        // Clear error khi user nhập
        if (errors.items[index] && errors.items[index][field]) {
            const newErrors = { ...errors };
            newErrors.items[index] = { ...newErrors.items[index], [field]: '' };
            setErrors(newErrors);
        }
    };

    const handleNameChange = (value) => {
        setName(value);
        if (errors.name) {
            setErrors({ ...errors, name: '' });
        }
    };

    const handleAddItem = () => {
        setItems([...items, { vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }]);
        setErrors({
            ...errors,
            items: [...errors.items, { vocabulary: '', definition: '' }]
        });
    };

    const handleRemoveItem = (index) => {
        if (items.length === 1) {
            return;
        }
        const newItems = items.filter((_, i) => i !== index);
        const newErrors = { ...errors };
        newErrors.items = newErrors.items.filter((_, i) => i !== index);
        setItems(newItems);
        setErrors(newErrors);
    };

    const handleSubmit = async () => {
        // 1. Validate
        const newErrors = {
            name: '',
            items: items.map(() => ({ vocabulary: '', definition: '' }))
        };
        let hasError = false;

        // Validate tên
        if (!name.trim()) {
            newErrors.name = 'Vui lòng nhập tên bộ thẻ!';
            hasError = true;
        }

        // Validate items
        const validItems = items.filter(item => item.vocabulary.trim() && item.definition.trim());
        if (validItems.length === 0) {
            hasError = true;
        }

        // Validate từng item
        items.forEach((item, index) => {
            if (!item.vocabulary.trim()) {
                newErrors.items[index].vocabulary = 'Vui lòng nhập từ vựng!';
                hasError = true;
            }
            if (!item.definition.trim()) {
                newErrors.items[index].definition = 'Vui lòng nhập định nghĩa!';
                hasError = true;
            }
        });

        if (hasError) {
            setErrors(newErrors);
            // Scroll to first error
            if (!name.trim()) {
                document.querySelector('input[placeholder*="Từ vựng chủ đề"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                const firstErrorIndex = items.findIndex((item, idx) => 
                    !item.vocabulary.trim() || !item.definition.trim()
                );
                if (firstErrorIndex !== -1) {
                    const errorElement = document.querySelectorAll('.flashcard-item')[firstErrorIndex];
                    errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            return;
        }

        // 2. Prepare Payload
        const payload = {
            name: name.trim(),
            description: description.trim(),
            accessType: isPublic ? "PUBLIC" : "PRIVATE",
            items: validItems.map(item => ({
                vocabulary: item.vocabulary.trim(),
                definition: item.definition.trim(),
                pronunciation: item.pronunciation.trim(),
                audioUrl: item.audioUrl.trim()
            }))
        };

        // 3. Call API
        setIsSubmitting(true);
        try {
            const res = await callUpdateFlashcard(id, payload);
            if (res && (res.status >= 200 && res.status < 300)) {
                message.success("Cập nhật thành công!");
                navigate(`/flashcards/${id}`);
            }
        } catch (error) {
            console.error(error);
            const errorMsg = error?.message || error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.";
            message.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    // Hiển thị UI 404 custom khi không tìm thấy hoặc không có quyền truy cập
    if (isNotFound) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <Card className="max-w-md w-full shadow-lg rounded-xl border-gray-200">
                    <div className="text-center py-8">
                        <div className="mb-6">
                            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <LockOutlined className="text-4xl text-gray-400" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Không tìm thấy
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Bộ thẻ này không tồn tại hoặc bạn không có quyền truy cập.
                        </p>
                        <Button
                            type="primary"
                            onClick={() => navigate('/flashcards')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Quay lại thư viện
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* --- HEADER CỐ ĐỊNH (Sticky Header) --- */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate(`/flashcards/${id}`)}
                        className="border-none shadow-none hover:bg-gray-100"
                    />
                    <h1 className="text-xl font-bold text-gray-800 m-0">
                        Chỉnh sửa bộ thẻ
                    </h1>
                </div>
                <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    loading={isSubmitting}
                    onClick={handleSubmit}
                    className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg font-semibold"
                >
                    Lưu thay đổi
                </Button>
            </div>

            {/* --- BODY --- */}
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                
                {/* 1. THÔNG TIN CHUNG */}
                <Card className="shadow-sm rounded-xl border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                                <Input 
                                    size="large" 
                                    placeholder="VD: Từ vựng chủ đề Kinh tế..." 
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className={`font-semibold ${errors.name ? 'border-red-500' : ''}`}
                                    status={errors.name ? 'error' : ''}
                                />
                                {errors.name && (
                                    <div className="text-red-500 text-sm mt-1">{errors.name}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <TextArea 
                                    rows={3} 
                                    placeholder="Mô tả giúp người học hiểu rõ hơn về bộ thẻ này..." 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1 bg-blue-50 p-4 rounded-lg flex flex-col justify-center items-center gap-3 border border-blue-100">
                            <span className="font-medium text-gray-700">Chế độ hiển thị</span>
                            <Switch 
                                checkedChildren={<GlobalOutlined />}
                                unCheckedChildren={<LockOutlined />}
                                checked={isPublic}
                                onChange={setIsPublic}
                                className="scale-125"
                            />
                            <span className={`text-sm font-bold ${isPublic ? 'text-blue-600' : 'text-gray-500'}`}>
                                {isPublic ? 'Công khai (Public)' : 'Riêng tư (Private)'}
                            </span>
                            <p className="text-xs text-center text-gray-500 mt-2">
                                {isPublic 
                                    ? 'Mọi người có thể tìm thấy và học bộ thẻ này.' 
                                    : 'Chỉ mình bạn mới có thể nhìn thấy bộ thẻ này.'}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* 2. DANH SÁCH TỪ VỰNG */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800">Danh sách từ vựng ({items.length})</h2>
                    
                    {items.map((item, index) => (
                        <div key={index} className="flashcard-item bg-white rounded-xl shadow-sm border p-4 relative group hover:border-blue-300 transition-all" style={{
                            borderColor: (errors.items[index]?.vocabulary || errors.items[index]?.definition) ? '#ef4444' : '#e5e7eb'
                        }}>
                            {/* Số thứ tự */}
                            <div className="absolute -left-3 top-4 w-8 h-8 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center font-bold text-gray-500 text-sm z-10">
                                {index + 1}
                            </div>

                            {/* Nút xóa */}
                            <Tooltip title="Xóa thẻ này">
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => handleRemoveItem(index)}
                                    className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity"
                                />
                            </Tooltip>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                                {/* Cột Từ vựng */}
                                <div className="space-y-3">
                                    <div className={`border-b-2 transition-colors pb-1 ${errors.items[index]?.vocabulary ? 'border-red-500' : 'border-transparent focus-within:border-blue-500'}`}>
                                        <label className="text-xs text-gray-400 uppercase font-semibold">Thuật ngữ (Term) <span className="text-red-500">*</span></label>
                                        <Input 
                                            variant="borderless" 
                                            placeholder="Nhập từ vựng..." 
                                            className="text-lg font-bold text-blue-900 px-0 py-1"
                                            value={item.vocabulary}
                                            onChange={(e) => handleItemChange(index, 'vocabulary', e.target.value)}
                                        />
                                        {errors.items[index]?.vocabulary && (
                                            <div className="text-red-500 text-xs mt-1">{errors.items[index].vocabulary}</div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="/Phiên âm/ (Optional)" 
                                            size="small"
                                            value={item.pronunciation}
                                            onChange={(e) => handleItemChange(index, 'pronunciation', e.target.value)}
                                            className="w-1/2"
                                        />
                                        <Input 
                                            placeholder="Audio URL (Optional)" 
                                            size="small"
                                            value={item.audioUrl}
                                            onChange={(e) => handleItemChange(index, 'audioUrl', e.target.value)}
                                            className="w-1/2"
                                        />
                                    </div>
                                </div>

                                {/* Cột Định nghĩa */}
                                <div className="space-y-3">
                                    <div className={`border-b-2 transition-colors pb-1 ${errors.items[index]?.definition ? 'border-red-500' : 'border-transparent focus-within:border-blue-500'}`}>
                                        <label className="text-xs text-gray-400 uppercase font-semibold">Định nghĩa (Definition) <span className="text-red-500">*</span></label>
                                        <Input 
                                            variant="borderless" 
                                            placeholder="Nhập định nghĩa..." 
                                            className="text-lg text-gray-800 px-0 py-1"
                                            value={item.definition}
                                            onChange={(e) => handleItemChange(index, 'definition', e.target.value)}
                                        />
                                        {errors.items[index]?.definition && (
                                            <div className="text-red-500 text-xs mt-1">{errors.items[index].definition}</div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 italic pt-2">
                                        * Gợi ý: Có thể nhập câu ví dụ vào phần định nghĩa nếu cần.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Nút Thêm Thẻ - UI Lớn */}
                    <button 
                        onClick={handleAddItem}
                        className="w-full py-6 bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-semibold group"
                    >
                        <PlusOutlined className="text-2xl mb-2 group-hover:scale-110 transition-transform" />
                        <span>Thêm thẻ mới</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlashcardEditPage;
