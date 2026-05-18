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
import { UserIcon, BookmarkIcon, AcademicCapIcon, ArrowsRightLeftIcon, ClipboardDocumentCheckIcon, LanguageIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import FlashcardStudyModal from '../../components/client/modal/FlashcardStudyModal';
import AudioPlayerUI from '../../components/client/modal/AudioPlayerUI';

const FlashcardViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [flashcardData, setFlashcardData] = useState(null);
    const [isNotFound, setIsNotFound] = useState(false); // Lỗi 404 - không tìm thấy hoặc không có quyền
    
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
        setIsNotFound(false);
        try {
            const res = await callFetchFlashcardDetail(id);
            if (res && res.data) {
                const data = res.data;
                setFlashcardData(data);
                // Xử lý các field từ API
                setIsOwner(data.isOwner ?? false);
                setIsFavourite(data.isFavourite ?? false);
            }
        } catch (error) {
            console.error(error);
            // Nếu là lỗi 404 (không tìm thấy hoặc không có quyền truy cập)
            if (error?.statusCode === 404) {
                setIsNotFound(true);
            } else {
                // Các lỗi khác vẫn hiển thị message và navigate
                message.error(error?.message || "Unable to load flashcard set information!");
                navigate('/flashcards');
            }
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
                message.success("Removed from favorites");
            } else {
                await callAddToFavourite(id);
                setIsFavourite(true);
                message.success("Added to favorites");
            }
        } catch (error) {
            message.error(error?.message || "Something went wrong");
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
            message.success("Flashcard set deleted successfully!");
            navigate('/flashcards', { state: { activeTab: 'my' } });
        } catch (error) {
            message.error(error?.message || "Unable to delete flashcard set");
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
                            Not found
                        </h2>
                        <p className="text-gray-600 mb-6">
                            This flashcard set does not exist or you do not have permission to access it.
                        </p>
                        <Button
                            type="primary"
                            onClick={() => navigate('/flashcards')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Back to library
                        </Button>
                    </div>
                </Card>
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
                                            ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {isFavourite ? 'Saved' : 'Save'}
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
                                            Edit
                                        </Button>
                                        <Popconfirm
                                            title="Delete flashcard set"
                                            description="Are you sure you want to delete this flashcard set?"
                                            onConfirm={handleDelete}
                                            okText="Delete"
                                            cancelText="Cancel"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button
                                                danger
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                            >
                                                Delete
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
                                        <span className="text-green-700 font-medium">Public</span>
                                    </>
                                ) : (
                                    <>
                                        <LockOutlined className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-700 font-medium">Private</span>
                                    </>
                                )}
                            </div>
                            
                            {/* Divider */}
                            <span className="text-gray-300">•</span>
                            
                            {/* Số lượng từ vựng */}
                            <span className="text-sm text-gray-600">{items.length} vocabulary terms</span>
                        </div>
                    </div>
                </Card>

                {/* 2. CHẾ ĐỘ HỌC */}
                <Card className="shadow-sm rounded-xl border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <AcademicCapIcon className="w-6 h-6 text-gray-700" />
                        <h3 className="text-lg font-bold text-gray-800">Practice modes</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card Thẻ ghi nhớ (Flashcard) */}
                        <button 
                            onClick={() => setIsStudyModalOpen(true)}
                            className="p-6 rounded-xl hover:shadow-md transition-all text-left border-0 text-white"
                            style={{ background: '#22c55e' }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20">
                                    <BookmarkSolid className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-white">Flashcard</h4>
                            </div>
                            <p className="text-sm text-white/90">Practice with memory cards, flip cards to view meanings and examples</p>
                        </button>

                        {/* Nối từ với nghĩa */}
                        <button 
                            onClick={() => navigate(`/flashcards/${id}/match`)}
                            className="p-6 rounded-xl hover:shadow-md transition-all text-left border-0 text-white"
                            style={{ background: '#3b82f6' }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20">
                                    <ArrowsRightLeftIcon className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-white">Match words with meanings</h4>
                            </div>
                            <p className="text-sm text-white/90">Drag and drop or select matching word-definition pairs</p>
                        </button>

                        {/* Trắc nghiệm lựa chọn */}
                        <button 
                            onClick={() => navigate(`/flashcards/${id}/quiz`)}
                            className="p-6 rounded-xl hover:shadow-md transition-all text-left border-0 text-white"
                            style={{ background: '#8b5cf6' }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20">
                                    <ClipboardDocumentCheckIcon className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-white">Multiple-choice quiz</h4>
                            </div>
                            <p className="text-sm text-white/90">A 4-option quiz where you choose the correct answer for each word</p>
                        </button>

                        {/* Hiển thị tiếng Việt, nhập từ tiếng Anh */}
                        <button 
                            onClick={() => navigate(`/flashcards/${id}/type`)}
                            className="p-6 rounded-xl hover:shadow-md transition-all text-left border-0 text-white"
                            style={{ background: '#f97316' }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20">
                                    <LanguageIcon className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-white">See the meaning, type the English word</h4>
                            </div>
                            <p className="text-sm text-white/90">View the meaning and type the matching English vocabulary term</p>
                        </button>

                        {/* Luyện câu với AI */}
                        <button 
                            onClick={() => navigate(`/flashcards/${id}/sentence-practice`)}
                            className="p-6 rounded-xl hover:shadow-md transition-all text-left border-0 text-white md:col-span-2"
                            style={{ background: '#ec4899' }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20">
                                    <PencilSquareIcon className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-white">Sentence practice with AI</h4>
                            </div>
                            <p className="text-sm text-white/90">Create sentences with vocabulary and receive AI feedback</p>
                        </button>
                    </div>
                </Card>

                {/* 3. DANH SÁCH TỪ VỰNG (Chế độ xem) */}
                <Card className="shadow-sm rounded-xl border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        Vocabulary list ({items.length})
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
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Term</span>
                                            </div>
                                            <h4 className="text-xl font-bold text-blue-900">
                                                {item.vocabulary || item.word || 'N/A'}
                                            </h4>
                                            {item.pronunciation && (
                                                <p className="text-sm text-gray-500">/{item.pronunciation}/</p>
                                            )}
                                            {item.audioUrl && (
                                                <div className="mt-3 max-w-md">
                                                    <AudioPlayerUI audioUrl={item.audioUrl} playButtonOnly />
                                                </div>
                                            )}
                                        </div>

                                        {/* Cột Định nghĩa */}
                                        <div className="space-y-2">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Definition</span>
                                            <p className="text-lg text-gray-800">
                                                {item.definition || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No vocabulary terms yet
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
