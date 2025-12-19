import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    callFetchPublicFlashcards, 
    callFetchMyFlashcards, 
    callFetchFavouriteFlashcards,
    callAddToFavourite,
    callRemoveFromFavourite
} from '../../api/api';
import { Spin, Pagination, Empty, message } from 'antd';
import { HeartIcon, BookOpenIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import FlashcardStudyModal from '../../components/client/modal/FlashcardStudyModal';

const FlashcardLibrary = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // State quản lý Tabs - Kiểm tra state từ navigate để set tab mặc định
    const [activeTab, setActiveTab] = useState(() => {
        // Nếu có state từ navigate (quay lại từ trang tạo/sửa), set về tab 'my'
        return location.state?.activeTab || 'public';
    });
    
    // State dữ liệu
    const [dataFlashcards, setDataFlashcards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // State phân trang
    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const [total, setTotal] = useState(0);

    // State cho Modal học
    const [isShowStudyModal, setIsShowStudyModal] = useState(false);
    const [currentDeckId, setCurrentDeckId] = useState(null);

    // Hàm gọi API lấy dữ liệu
    const fetchFlashcards = async () => {
        setIsLoading(true);
        let query = `page=${current - 1}&size=${pageSize}`; // BE page bắt đầu từ 0
        let res = null;

        try {
            if (activeTab === 'public') {
                res = await callFetchPublicFlashcards(query);
            } else if (activeTab === 'my') {
                res = await callFetchMyFlashcards(query);
            } else if (activeTab === 'favourite') {
                res = await callFetchFavouriteFlashcards(query);
            }

            if (res && res.data) {
                // Cấu trúc response: { meta: { total, page, pageSize, pages }, result: [...] }
                const responseData = res.data;
                const flashcards = responseData.result || responseData.content || responseData || [];
                const meta = responseData.meta || {};
                
                // Sử dụng field 'favourite' từ API, nếu ở tab favourite thì tất cả đều là favourite
                const flashcardsWithFavourite = flashcards.map(item => ({
                    ...item,
                    favourite: activeTab === 'favourite' ? true : (item.favourite || false)
                }));
                
                setDataFlashcards(flashcardsWithFavourite);
                setTotal(meta.total || responseData.totalElements || responseData.total || 0);
            }
        } catch (error) {
            console.error(error);
            message.error(error?.message || 'Không thể tải danh sách flashcard');
        } finally {
            setIsLoading(false);
        }
    };

    // Effect để xử lý khi có state từ navigate (quay lại từ trang tạo/sửa)
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            // Xóa state để tránh set lại khi component re-render
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Effect gọi lại khi tab hoặc phân trang thay đổi
    useEffect(() => {
        fetchFlashcards();
    }, [activeTab, current, pageSize]);

    // Xử lý chuyển tab
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrent(1); // Reset về trang 1 khi đổi tab
        setDataFlashcards([]);
    };

    // Xử lý Yêu thích/Bỏ yêu thích
    const handleToggleFavourite = async (item, e) => {
        e.stopPropagation(); // Ngăn event bubble lên card
        try {
            const isCurrentlyFavourite = item.favourite || activeTab === 'favourite';
            
            if (isCurrentlyFavourite) {
                await callRemoveFromFavourite(item.id);
                message.success("Đã xóa khỏi yêu thích");
            } else {
                await callAddToFavourite(item.id);
                message.success("Đã thêm vào yêu thích");
            }
            fetchFlashcards(); // Load lại data để cập nhật UI
        } catch (error) {
            message.error(error?.message || "Có lỗi xảy ra");
        }
    };

    // Xử lý mở modal học
    const handleStudyFlashcard = (id) => {
        setCurrentDeckId(id);
        setIsShowStudyModal(true);
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
            {/* --- HEADER & TABS --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-blue-800 mb-4 md:mb-0">Thư viện Flashcard</h1>
                {/* Nút tạo mới chỉ hiện ở Tab 'My' */}
                {activeTab === 'my' && (
                    <button 
                        onClick={() => navigate('/flashcards/create')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="w-5 h-5" /> Tạo bộ thẻ mới
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
                {[
                    { key: 'public', label: 'Cộng đồng' },
                    { key: 'my', label: 'Của tôi' },
                    { key: 'favourite', label: 'Đã lưu' }
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={`px-6 py-3 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                            activeTab === tab.key
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* --- LIST CONTENT --- */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {dataFlashcards.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {dataFlashcards.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col overflow-hidden group cursor-pointer"
                                    onClick={() => handleStudyFlashcard(item.id)}
                                >
                                    <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500 p-4 flex justify-center items-center">
                                        <BookOpenIcon className="w-12 h-12 text-white opacity-80" />
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-lg text-gray-800 line-clamp-1 flex-1">{item.name}</h3>
                                            {item.accessType && (
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                                                    item.accessType === 'PUBLIC' 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {item.accessType === 'PUBLIC' ? 'Public' : 'Private'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                            <span>{item.itemCount || item.itemsCount || 0} từ vựng</span>
                                            {item.favouriteCount > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <HeartSolid className="w-4 h-4 text-red-400" />
                                                    {item.favouriteCount}
                                                </span>
                                            )}
                                        </div>
                                        {item.authorFullName && activeTab !== 'my' && (
                                            <p className="text-xs text-gray-400 mt-2">Tác giả: {item.authorFullName}</p>
                                        )}
                                        <div className={`mt-4 flex ${activeTab === 'my' ? 'justify-start' : 'justify-between'} items-center pt-4 border-t border-gray-100`}>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStudyFlashcard(item.id);
                                                    }}
                                                    className="text-blue-600 font-medium text-sm hover:underline"
                                                >
                                                    Học ngay
                                                </button>
                                                
                                                {/* Nút Edit - Chỉ hiện khi ở tab 'my' */}
                                                {activeTab === 'my' && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/flashcards/${item.id}/edit`);
                                                        }}
                                                        className="text-gray-500 hover:text-blue-600 transition-colors"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <PencilSquareIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Chỉ hiển thị nút yêu thích ở tab Public và Favourite, không hiển thị ở tab My */}
                                            {activeTab !== 'my' && (
                                                <button 
                                                    onClick={(e) => handleToggleFavourite(item, e)}
                                                    className="transition-colors"
                                                >
                                                    {(item.favourite || activeTab === 'favourite') ? (
                                                        <HeartSolid className="w-6 h-6 text-red-500" />
                                                    ) : (
                                                        <HeartIcon className="w-6 h-6 text-gray-400 hover:text-red-500" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty description="Chưa có bộ flashcard nào" />
                    )}

                    {/* Pagination */}
                    {total > 0 && (
                        <div className="mt-8 flex justify-center">
                            <Pagination 
                                current={current} 
                                pageSize={pageSize} 
                                total={total}
                                onChange={(p, s) => { 
                                    setCurrent(p); 
                                    setPageSize(s); 
                                }} 
                                showSizeChanger
                                pageSizeOptions={['8', '12', '16', '24']}
                            /> 
                        </div>
                    )}
                </>
            )}

            {/* Modal Học Flashcard */}
            <FlashcardStudyModal 
                isOpen={isShowStudyModal}
                setIsOpen={setIsShowStudyModal}
                flashcardId={currentDeckId}
            />
        </div>
    );
};

export default FlashcardLibrary;
