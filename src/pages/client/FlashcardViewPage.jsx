import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Spin, Card, Popconfirm } from 'antd';
import { 
    EditOutlined,
    DeleteOutlined,
    GlobalOutlined,
    LockOutlined
} from '@ant-design/icons';
import { 
    callFetchFlashcardDetail,
    callAddToFavourite,
    callRemoveFromFavourite,
    callDeleteFlashcard
} from '../../api/api';
import { UserIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import FlashcardStudyModal from '../../components/client/modal/FlashcardStudyModal';

const FlashcardViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [flashcardData, setFlashcardData] = useState(null);
    
    // State từ API
    const [isOwner, setIsOwner] = useState(false); // Quyền sở hữu - API sẽ trả về field này
    const [isFavourite, setIsFavourite] = useState(false); // Đã lưu/chưa lưu - mặc định false
    
    // State cho modal học flashcard
    const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);

    // --- FETCH DATA ---
    useEffect(() => {
        if (id) {
            fetchFlashcardData();
        }
    }, [id]);

    const fetchFlashcardData = async () => {
        setIsLoading(true);
        try {
            const res = await callFetchFlashcardDetail(id);
            if (res && res.data) {
                const data = res.data;
                setFlashcardData(data);
                // Xử lý các field từ API
                setIsOwner(true); // Tạm thời set true để test - sau này sẽ dùng: data.isOwner ?? false
                setIsFavourite(data.favourite ?? false); // Đã lưu/chưa lưu, mặc định false
            }
        } catch (error) {
            console.error(error);
            message.error("Không thể tải thông tin bộ thẻ!");
            navigate('/flashcards');
        } finally {
            setIsLoading(false);
        }
    };

    // Xử lý Lưu/Bỏ lưu
    const handleToggleFavourite = async () => {
        try {
            if (isFavourite) {
                await callRemoveFromFavourite(id);
                setIsFavourite(false);
                message.success("Đã xóa khỏi yêu thích");
            } else {
                await callAddToFavourite(id);
                setIsFavourite(true);
                message.success("Đã thêm vào yêu thích");
            }
        } catch (error) {
            message.error(error?.message || "Có lỗi xảy ra");
        }
    };

    // Xử lý Chỉnh sửa
    const handleEdit = () => {
        navigate(`/flashcards/${id}/edit`);
    };

    // Xử lý Xóa
    const handleDelete = async () => {
        try {
            await callDeleteFlashcard(id);
            message.success("Đã xóa bộ thẻ thành công!");
            navigate('/flashcards', { state: { activeTab: 'my' } });
        } catch (error) {
            message.error(error?.message || "Không thể xóa bộ thẻ");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    if (!flashcardData) {
        return null;
    }

    const { name, description, accessType, authorFullName, items = [] } = flashcardData;
    const isPublic = accessType === 'PUBLIC';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* --- BODY --- */}
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                
                {/* 1. THÔNG TIN HEADER - Thiết kế lại */}
                <Card className="shadow-md rounded-xl border-gray-200 bg-white">
                    <div className="space-y-4">
                        {/* Row 1: Tên và Actions */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{name}</h1>
                            </div>
                            
                            {/* Actions - Bố trí ngang */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Nút Lưu/Đã lưu */}
                                <Button
                                    icon={isFavourite ? <BookmarkSolid className="w-4 h-4" /> : <BookmarkIcon className="w-4 h-4" />}
                                    onClick={handleToggleFavourite}
                                    size="small"
                                    className={`${
                                        isFavourite 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {isFavourite ? 'Đã lưu' : 'Lưu'}
                                </Button>

                                {/* Nút Chỉnh sửa và Xóa - chỉ hiện khi có quyền sở hữu */}
                                {isOwner && (
                                    <>
                                        <Button
                                            icon={<EditOutlined />}
                                            onClick={handleEdit}
                                            size="small"
                                            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        >
                                            Chỉnh sửa
                                        </Button>
                                        <Popconfirm
                                            title="Xóa bộ thẻ"
                                            description="Bạn có chắc chắn muốn xóa bộ thẻ này?"
                                            onConfirm={handleDelete}
                                            okText="Xóa"
                                            cancelText="Hủy"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button
                                                danger
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                            >
                                                Xóa
                                            </Button>
                                        </Popconfirm>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Mô tả */}
                        {description && (
                            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
                        )}

                        {/* Row 3: Meta info - Phía dưới divider */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
                            {/* Tác giả */}
                            {authorFullName && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <UserIcon className="w-4 h-4" />
                                    <span>{authorFullName}</span>
                                </div>
                            )}
                            
                            {/* Divider */}
                            {authorFullName && (
                                <span className="text-gray-300">•</span>
                            )}
                            
                            {/* Chế độ hiển thị */}
                            <div className="flex items-center gap-1.5 text-sm">
                                {isPublic ? (
                                    <>
                                        <GlobalOutlined className="w-4 h-4 text-green-600" />
                                        <span className="text-green-700 font-medium">Công khai</span>
                                    </>
                                ) : (
                                    <>
                                        <LockOutlined className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-700 font-medium">Riêng tư</span>
                                    </>
                                )}
                            </div>
                            
                            {/* Divider */}
                            <span className="text-gray-300">•</span>
                            
                            {/* Số lượng từ vựng */}
                            <span className="text-sm text-gray-600">{items.length} từ vựng</span>
                        </div>
                    </div>
                </Card>

                {/* 2. CHẾ ĐỘ HỌC */}
                <Card className="shadow-sm rounded-xl border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Chế độ học</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Card Thẻ ghi nhớ */}
                        <button 
                            onClick={() => setIsStudyModalOpen(true)}
                            className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <BookmarkSolid className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-800">Thẻ ghi nhớ</h4>
                            </div>
                            <p className="text-sm text-gray-600">Học từ vựng bằng flashcard</p>
                        </button>

                        {/* Các game khác sẽ bổ sung sau */}
                    </div>
                </Card>

                {/* 3. DANH SÁCH TỪ VỰNG (Chế độ xem) */}
                <Card className="shadow-sm rounded-xl border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        Danh sách từ vựng ({items.length})
                    </h3>
                    
                    <div className="space-y-4">
                        {items.length > 0 ? (
                            items.map((item, index) => (
                                <div 
                                    key={index} 
                                    className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-all"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Cột Từ vựng */}
                                        <div className="space-y-2">
                                            <div className="mb-2">
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Thuật ngữ</span>
                                            </div>
                                            <h4 className="text-xl font-bold text-blue-900">
                                                {item.vocabulary || item.word || 'N/A'}
                                            </h4>
                                            {item.pronunciation && (
                                                <p className="text-sm text-gray-500">/{item.pronunciation}/</p>
                                            )}
                                            {item.audioUrl && (
                                                <audio controls className="w-full mt-2">
                                                    <source src={item.audioUrl} type="audio/mpeg" />
                                                </audio>
                                            )}
                                        </div>

                                        {/* Cột Định nghĩa */}
                                        <div className="space-y-2">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Định nghĩa</span>
                                            <p className="text-lg text-gray-800">
                                                {item.definition || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                Chưa có từ vựng nào
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Modal học flashcard */}
            <FlashcardStudyModal 
                isOpen={isStudyModalOpen}
                setIsOpen={setIsStudyModalOpen}
                flashcardId={id}
            />
        </div>
    );
};

export default FlashcardViewPage;
