import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    callFetchPublicFlashcards, 
    callFetchMyFlashcards, 
    callFetchFavouriteFlashcards,
    callFetchFlashcardOverall
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

    // State cho tab Ôn tập (API overall)
    const [overallData, setOverallData] = useState(null);
    const [overallLoading, setOverallLoading] = useState(false);

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
            } else if (activeTab === 'review') {
                // Tab Ôn tập không gọi danh sách flashcard ở đây
                return;
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

    // Gọi API overall khi vào tab Ôn tập
    const fetchOverall = async () => {
        setOverallLoading(true);
        setOverallData(null);
        try {
            const res = await callFetchFlashcardOverall();
            const data = res?.data;
            setOverallData(data?.result ?? data ?? null);
        } catch (err) {
            console.error(err);
            message.error(err?.message || 'Không tải được thống kê ôn tập');
        } finally {
            setOverallLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'review') {
            fetchOverall();
        }
    }, [activeTab]);

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
                    { key: 'favourite', label: 'Đã lưu' },
                    { key: 'review', label: 'Ôn tập' },
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

            {/* --- REVIEW SUMMARY & DUE CARD (tab Ôn tập) --- */}
            {activeTab === 'review' && (
                <div className="space-y-4 mb-8">
                    {overallLoading ? (
                        <div className="flex justify-center py-12">
                            <Spin size="large" />
                        </div>
                    ) : (
                        <>
                            {/* Mục tiêu hôm nay: Ôn tập & Từ mới */}
                            <div className="flex flex-col lg:flex-row gap-4">
                                {/* Ôn tập - số từ đã ôn */}
                                <div className="flex-1 bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200 rounded-2xl p-4 sm:p-6 flex items-center justify-between gap-4 shadow-sm">
                                    <div>
                                        <p className="text-sm font-semibold text-pink-600 mb-1">Số từ đã ôn</p>
                                        <p className="text-3xl font-semibold text-pink-700">
                                            {overallData?.totalLearnedWords ?? 0}{' '}
                                            <span className="text-base font-normal text-gray-600">từ</span>
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1">Không giới hạn</p>
                                    </div>
                                </div>

                                {/* Từ mới */}
                                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-blue-600 mb-1">Số từ mới</p>
                                        <p className="text-2xl font-semibold text-blue-700 mb-2">
                                            {overallData?.totalNewWords ?? 0}
                                            <span className="text-base font-normal text-gray-600"> từ</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Từ cần ôn ngay */}
                            <div className="border border-purple-200 bg-purple-50 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm text-purple-600 mb-1">Từ cần ôn ngay</p>
                                    <p className="text-base sm:text-lg font-semibold text-purple-700">
                                        <span className="text-lg sm:text-xl font-bold">
                                            {overallData?.totalDueWords ?? 0}
                                        </span>{' '}
                                        từ đến hạn
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                                    onClick={() => navigate('/flashcards/due')}
                                >
                                    Ôn tập ngay
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* --- LIST CONTENT --- */}
            {activeTab !== 'review' && (
                <>
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
                </>
            )}
        </div>
    );
};

export default FlashcardLibrary;
