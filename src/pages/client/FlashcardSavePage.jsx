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
    callCreateFlashcard, 
    callFetchFlashcardDetail, 
    callUpdateFlashcard 
} from '../../api/api';

const { TextArea } = Input;

const FlashcardSavePage = () => {
    const { id } = useParams(); // Lấy ID từ URL (nếu có)
    const navigate = useNavigate();
    const isEditMode = !!id; // Nếu có ID thì là Edit Mode

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- STATE DỮ LIỆU ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [items, setItems] = useState([
        { vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }
    ]);

    // --- FETCH DATA (Nếu là Edit Mode) ---
    useEffect(() => {
        if (isEditMode) {
            fetchFlashcardData();
        }
    }, [id]);

    const fetchFlashcardData = async () => {
        setIsLoading(true);
        try {
            const res = await callFetchFlashcardDetail(id);
            if (res && res.data) {
                const data = res.data;
                setName(data.name || '');
                setDescription(data.description || '');
                setIsPublic(data.accessType === 'PUBLIC');
                // Map dữ liệu items từ BE về form
                if (data.items && data.items.length > 0) {
                    setItems(data.items.map(item => ({
                        vocabulary: item.vocabulary || item.word || '', // Fallback nếu BE trả về key khác
                        definition: item.definition || '',
                        pronunciation: item.pronunciation || '',
                        audioUrl: item.audioUrl || ''
                    })));
                } else {
                    // Nếu không có items, tạo một item trống
                    setItems([{ vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }]);
                }
            }
        } catch (error) {
            console.error(error);
            message.error("Không thể tải thông tin bộ thẻ!");
            navigate('/flashcards');
        } finally {
            setIsLoading(false);
        }
    };

    // --- CÁC HÀM XỬ LÝ FORM ---
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length === 1) {
            message.warning("Cần ít nhất 1 từ vựng!");
            return;
        }
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleSubmit = async () => {
        // 1. Validate
        if (!name.trim()) {
            message.error("Vui lòng nhập tên bộ thẻ!");
            return;
        }
        const validItems = items.filter(item => item.vocabulary.trim() && item.definition.trim());
        if (validItems.length === 0) {
            message.error("Vui lòng nhập ít nhất 1 từ vựng đầy đủ (Từ & Nghĩa)!");
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
            if (isEditMode) {
                const res = await callUpdateFlashcard(id, payload);
                if (res && (res.status >= 200 && res.status < 300)) {
                    message.success("Cập nhật thành công!");
                    navigate('/flashcards', { state: { activeTab: 'my' } });
                }
            } else {
                const res = await callCreateFlashcard(payload);
                if (res && (res.status >= 200 && res.status < 300)) {
                    message.success("Tạo bộ thẻ mới thành công!");
                    navigate('/flashcards', { state: { activeTab: 'my' } });
                }
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* --- HEADER CỐ ĐỊNH (Sticky Header) --- */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/flashcards', { state: { activeTab: 'my' } })}
                        className="border-none shadow-none hover:bg-gray-100"
                    />
                    <h1 className="text-xl font-bold text-gray-800 m-0">
                        {isEditMode ? 'Chỉnh sửa bộ thẻ' : 'Tạo bộ thẻ mới'}
                    </h1>
                </div>
                <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    loading={isSubmitting}
                    onClick={handleSubmit}
                    className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg font-semibold"
                >
                    {isEditMode ? 'Lưu thay đổi' : 'Hoàn tất'}
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
                                    onChange={(e) => setName(e.target.value)}
                                    className="font-semibold"
                                />
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
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative group hover:border-blue-300 transition-all">
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
                                    <div className="border-b-2 border-transparent focus-within:border-blue-500 transition-colors pb-1">
                                        <label className="text-xs text-gray-400 uppercase font-semibold">Thuật ngữ (Term)</label>
                                        <Input 
                                            variant="borderless" 
                                            placeholder="Nhập từ vựng..." 
                                            className="text-lg font-bold text-blue-900 px-0 py-1"
                                            value={item.vocabulary}
                                            onChange={(e) => handleItemChange(index, 'vocabulary', e.target.value)}
                                        />
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
                                    <div className="border-b-2 border-transparent focus-within:border-blue-500 transition-colors pb-1">
                                        <label className="text-xs text-gray-400 uppercase font-semibold">Định nghĩa (Definition)</label>
                                        <Input 
                                            variant="borderless" 
                                            placeholder="Nhập định nghĩa..." 
                                            className="text-lg text-gray-800 px-0 py-1"
                                            value={item.definition}
                                            onChange={(e) => handleItemChange(index, 'definition', e.target.value)}
                                        />
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

export default FlashcardSavePage;
