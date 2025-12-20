import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    callFetchPublicFlashcards, 
    callFetchMyFlashcards, 
    callFetchFavouriteFlashcards
} from '../../api/api';
import { Spin, Pagination, Empty, message } from 'antd';
import { PlusIcon } from '@heroicons/react/24/outline';
import FlashcardCard from '../../components/card/flashcard.card';

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
                // Cấu trúc response mới: { meta: { total, page, pageSize, pages }, result: [...] }
                const responseData = res.data;
                const flashcards = responseData.result || [];
                const meta = responseData.meta || {};
                
                // Xử lý các field optional: favourite, favouriteCount
                // Nếu ở tab favourite thì tất cả đều là favourite
                const flashcardsProcessed = flashcards.map(item => ({
                    ...item,
                    favourite: activeTab === 'favourite' ? true : (item.favourite ?? false),
                    favouriteCount: item.favouriteCount ?? 0
                }));
                
                setDataFlashcards(flashcardsProcessed);
                setTotal(meta.total || 0);
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

    // Callback để refresh data sau khi toggle favourite
    const handleFavouriteChange = () => {
        fetchFlashcards();
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
            {/* --- HEADER & TABS --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-blue-800 mb-4 md:mb-0">Thư viện Flashcard</h1>
                {/* Nút tạo mới hiện ở tất cả các tab */}
                <button 
                    onClick={() => navigate('/flashcards/create')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <PlusIcon className="w-5 h-5" /> Tạo bộ thẻ mới
                </button>
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
                                <FlashcardCard
                                    key={item.id}
                                    item={item}
                                    activeTab={activeTab}
                                    onFavouriteChange={handleFavouriteChange}
                                />
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
        </div>
    );
};

export default FlashcardLibrary;
