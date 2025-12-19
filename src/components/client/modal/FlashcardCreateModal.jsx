import React, { useState } from 'react';
import { Modal, Input, Switch, message, Button, Tooltip } from 'antd';
import { 
    PlusOutlined, 
    DeleteOutlined, 
    BookOutlined, 
    GlobalOutlined, 
    LockOutlined 
} from '@ant-design/icons';
import { callCreateFlashcard } from '../../../api/api';

const { TextArea } = Input;

const FlashcardCreateModal = ({ isOpen, setIsOpen, refreshList }) => {
    const [isLoading, setIsLoading] = useState(false);

    // --- STATE QUẢN LÝ DỮ LIỆU ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true); // Default là Public

    // State danh sách từ vựng (Items)
    const [items, setItems] = useState([
        { vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }
    ]);

    // --- ACTIONS ---

    // 1. Reset form khi đóng modal
    const handleClose = () => {
        setName('');
        setDescription('');
        setIsPublic(true);
        setItems([{ vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }]);
        setIsOpen(false);
    };

    // 2. Xử lý thay đổi giá trị trong danh sách items
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    // 3. Thêm dòng mới
    const handleAddItem = () => {
        setItems([...items, { vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }]);
    };

    // 4. Xóa dòng
    const handleRemoveItem = (index) => {
        if (items.length === 1) {
            message.warning("Cần ít nhất 1 từ vựng trong bộ thẻ!");
            return;
        }
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    // 5. XỬ LÝ SUBMIT (QUAN TRỌNG NHẤT)
    const handleSubmit = async () => {
        // --- VALIDATION FE ---
        if (!name.trim()) {
            message.error("Vui lòng nhập tên bộ thẻ!");
            return;
        }

        // Kiểm tra từng item
        const invalidItems = items.filter(item => !item.vocabulary.trim() || !item.definition.trim());
        if (invalidItems.length > 0) {
            message.error("Vui lòng điền đầy đủ 'Từ vựng' và 'Định nghĩa' cho tất cả các dòng!");
            return;
        }

        // --- MAPPING DỮ LIỆU KHỚP BACKEND ---
        const payload = {
            name: name.trim(),
            description: description.trim(),
            // Mapping Boolean -> Enum String
            accessType: isPublic ? "PUBLIC" : "PRIVATE", 
            items: items.map(item => ({
                vocabulary: item.vocabulary.trim(),
                definition: item.definition.trim(),
                pronunciation: item.pronunciation.trim(),
                audioUrl: item.audioUrl.trim() // Backend có field này, gửi chuỗi rỗng nếu không có
            }))
        };

        // --- GỌI API ---
        setIsLoading(true);
        try {
            const res = await callCreateFlashcard(payload);
            // Kiểm tra response dựa trên cấu hình axios của bạn
            // Response từ axios-customize có format: { status, data, headers }
            if (res && (res.status >= 200 && res.status < 300)) { 
                message.success("Tạo Flashcard thành công!");
                
                // Reset form và đóng modal
                setName('');
                setDescription('');
                setIsPublic(true);
                setItems([{ vocabulary: '', definition: '', pronunciation: '', audioUrl: '' }]);
                setIsOpen(false);
                
                // Refresh list sau khi đóng modal
                if (refreshList) {
                    setTimeout(() => {
                        refreshList(); // Load lại danh sách ở trang cha
                    }, 100);
                }
            } else {
                message.error("Có lỗi xảy ra khi tạo flashcard!");
            }
        } catch (error) {
            console.error("Error creating flashcard:", error);
            const errorMsg = error?.message || error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!";
            message.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2 text-blue-600 text-lg">
                    <BookOutlined /> Tạo bộ Flashcard mới
                </div>
            }
            open={isOpen}
            onCancel={handleClose}
            onOk={handleSubmit}
            confirmLoading={isLoading}
            width={900}
            okText="Tạo bộ thẻ"
            cancelText="Hủy"
            maskClosable={false}
            centered
            className="top-5"
        >
            <div className="flex flex-col gap-5 py-2">
                
                {/* --- PHẦN 1: THÔNG TIN CHUNG (Meta Data) --- */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Tên & Mô tả */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Tên bộ thẻ <span className="text-red-500">*</span></label>
                                <Input 
                                    placeholder="VD: 600 từ vựng TOEIC..." 
                                    size="large"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={100}
                                    showCount
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Mô tả</label>
                                <TextArea 
                                    placeholder="Mô tả nội dung bộ thẻ..." 
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Quyền riêng tư */}
                        <div className="w-full md:w-48 bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-2 shadow-sm">
                            <span className="text-sm font-medium text-gray-600">Quyền truy cập</span>
                            <Switch 
                                checked={isPublic}
                                onChange={setIsPublic}
                                checkedChildren={<GlobalOutlined />}
                                unCheckedChildren={<LockOutlined />}
                                className="bg-gray-300"
                            />
                            <span className={`text-xs font-bold ${isPublic ? 'text-green-600' : 'text-gray-500'}`}>
                                {isPublic ? 'Công khai (Public)' : 'Riêng tư (Private)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- PHẦN 2: DANH SÁCH TỪ VỰNG (Items) --- */}
                <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h3 className="font-bold text-gray-800 text-base">Danh sách từ vựng ({items.length})</h3>
                        <span className="text-xs text-gray-500 italic">* Từ vựng và Định nghĩa là bắt buộc</span>
                    </div>

                    {/* Container scroll */}
                    <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="group flex gap-3 items-start bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all">
                                
                                {/* Số thứ tự */}
                                <div className="mt-2 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                    {index + 1}
                                </div>

                                {/* Inputs Grid */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                                    {/* Cột 1: Vocabulary (4 phần) */}
                                    <div className="md:col-span-4">
                                        <Input 
                                            placeholder="Từ vựng (English)" 
                                            className="font-semibold text-blue-900"
                                            value={item.vocabulary}
                                            onChange={(e) => handleItemChange(index, 'vocabulary', e.target.value)}
                                            status={!item.vocabulary && items.length > 1 ? "warning" : ""}
                                        />
                                    </div>

                                    {/* Cột 2: Pronunciation (3 phần) */}
                                    <div className="md:col-span-3">
                                        <Input 
                                            placeholder="/IPA/" 
                                            value={item.pronunciation}
                                            onChange={(e) => handleItemChange(index, 'pronunciation', e.target.value)}
                                            prefix={<span className="text-gray-400 text-xs">IPA</span>}
                                        />
                                    </div>

                                    {/* Cột 3: Definition (5 phần) */}
                                    <div className="md:col-span-5">
                                        <Input 
                                            placeholder="Định nghĩa (Tiếng Việt)" 
                                            value={item.definition}
                                            onChange={(e) => handleItemChange(index, 'definition', e.target.value)}
                                        />
                                    </div>
                                    
                                    {/* Link Audio (Optional - có thể ẩn nếu chưa cần) */}
                                    {/* <div className="md:col-span-12">
                                        <Input 
                                            size="small"
                                            placeholder="Link Audio (Optional)" 
                                            value={item.audioUrl} 
                                            onChange={(e) => handleItemChange(index, 'audioUrl', e.target.value)}
                                            className="text-xs text-gray-500"
                                            prefix={<AudioOutlined />}
                                        />
                                    </div> */}
                                </div>

                                {/* Nút Xóa */}
                                <Tooltip title="Xóa dòng này">
                                    <Button 
                                        type="text" 
                                        danger 
                                        icon={<DeleteOutlined />} 
                                        onClick={() => handleRemoveItem(index)}
                                        className="opacity-50 group-hover:opacity-100 transition-opacity mt-1"
                                    />
                                </Tooltip>
                            </div>
                        ))}
                    </div>

                    {/* Nút Thêm dòng */}
                    <Button 
                        type="dashed" 
                        block 
                        icon={<PlusOutlined />} 
                        onClick={handleAddItem}
                        className="mt-4 h-10 border-blue-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                        Thêm từ vựng mới
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default FlashcardCreateModal;
