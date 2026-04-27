import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import { getPublicTestSets, getPublicTest } from '../../api/api';
import TestSetCard from '../../components/card/testset.card.jsx';
import TestCard from '../../components/card/test.card.jsx';
import { Spin, message, Pagination, Input, Select, Button } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { toSlug } from '../../utils/slug';

const TestList = () => {
    const [testSets, setTestSets] = useState([]);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTests, setLoadingTests] = useState(false);
    const navigate = useNavigate();
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(12);
    const [total, setTotal] = useState(0);
    const [selectedTestSet, setSelectedTestSet] = useState(null);
    
    // Search states
    const [searchName, setSearchName] = useState('');
    const [activeSearchName, setActiveSearchName] = useState(''); // Từ khóa đang được áp dụng
    const [selectedTestSetIds, setSelectedTestSetIds] = useState([]);

    useEffect(() => {
        fetchTestSets();
        fetchTests(1, '', []);
    }, []);

    const fetchTestSets = async () => {
        try {
            const response = await getPublicTestSets();
            setTestSets(response.data || []);
        } catch (error) {
            message.error('Không thể tải danh sách bộ đề thi');
        }
    };

    const fetchTests = async (page = 1, searchName = '', selectedIds = []) => {
        setLoadingTests(true);
        try {
            let query = `page=${page - 1}&size=${pageSize}`;
            
            // Sử dụng sort param cho danh sách IDs
            if (selectedIds.length > 0) {
                query += `&sort=${selectedIds.join(',')}`;
            }
            
            if (searchName && searchName.trim()) {
                query += `&name=${encodeURIComponent(searchName.trim())}`;
            }
            
            const response = await getPublicTest(query);
            setTests(response.data?.result || []);
            setTotal(response.data?.meta?.total || 0);
            setCurrentPage(page);
        } catch (error) {
            message.error('Không thể tải danh sách đề thi');
        } finally {
            setLoadingTests(false);
            setLoading(false);
        }
    };

    const handleTestSetClick = (testSet) => {
        // Toggle selection - add or remove from selected list
        if (selectedTestSetIds.includes(testSet.id)) {
            // If already selected, remove it
            const newIds = selectedTestSetIds.filter(id => id !== testSet.id);
            setSelectedTestSetIds(newIds);
            
            if (newIds.length === 0) {
                setSelectedTestSet(null);
            } else if (newIds.length === 1) {
                setSelectedTestSet(testSets.find(ts => ts.id === newIds[0]));
            } else {
                setSelectedTestSet(null);
            }
            
            // Fetch với danh sách mới
            fetchTests(1, activeSearchName, newIds);
        } else {
            // Add to selection
            const newIds = [...selectedTestSetIds, testSet.id];
            setSelectedTestSetIds(newIds);
            
            if (newIds.length === 1) {
                setSelectedTestSet(testSet);
            } else {
                setSelectedTestSet(null);
            }
            
            // Fetch với danh sách mới
            fetchTests(1, activeSearchName, newIds);
        }
    };

    const handlePageChange = (page) => {
        fetchTests(page, activeSearchName, selectedTestSetIds);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearch = () => {
        setActiveSearchName(searchName);
        fetchTests(1, searchName, selectedTestSetIds);
    };

    const handleReset = () => {
        setSearchName('');
        setActiveSearchName('');
        setSelectedTestSetIds([]);
        setSelectedTestSet(null);
        fetchTests(1, '', []);
    };

    const handleTestClick = (test) => {
        if (!test?.id) return;
        const slug = toSlug(test?.testName || 'test');
        navigate(`/online-tests/${test.id}/${slug}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8 flex items-center justify-center">
                <Spin size="large" tip="Đang tải danh sách bộ đề thi..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Section Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Bộ đề thi
                    </h1>
                    <p className="text-gray-600">
                        Chọn bộ đề thi TOEIC để bắt đầu làm bài
                    </p>
                </div>

                {/* Swiper for Test Sets */}
                {testSets.length > 0 ? (
                    <Swiper
                        modules={[FreeMode, Mousewheel]}
                        spaceBetween={16}
                        slidesPerView="auto"
                        freeMode={true}
                        mousewheel={{ forceToAxis: true }}
                        grabCursor={true}
                        className="!pb-4"
                    >
                        {testSets.map((testSet) => {
                            const isSelected = selectedTestSetIds.includes(testSet.id);
                            return (
                                <SwiperSlide key={testSet.id} className="!w-auto">
                                    <div 
                                        className={`${
                                            isSelected 
                                                ? 'ring-2 ring-blue-500 rounded-lg' 
                                                : ''
                                        }`}
                                    >
                                        <TestSetCard 
                                            testSet={testSet}
                                            onClick={() => handleTestSetClick(testSet)}
                                        />
                                    </div>
                                </SwiperSlide>
                            );
                        })}
                    </Swiper>
                ) : (
                    <div className="text-center py-16 bg-white rounded-lg">
                        <p className="text-gray-500 text-lg">
                            Hiện chưa có bộ đề thi nào
                        </p>
                    </div>
                )}

                {/* Search Section */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Tìm kiếm theo tên
                            </label>
                            <Input
                                size="large"
                                placeholder="Nhập tên đề thi..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onPressEnter={handleSearch}
                                prefix={<SearchOutlined className="text-gray-400" />}
                                className="w-full"
                            />
                        </div>

                        {/* Test Set Filter */}
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Bộ đề thi
                            </label>
                            <Select
                                mode="multiple"
                                size="large"
                                placeholder="Chọn bộ đề thi..."
                                value={selectedTestSetIds}
                                onChange={(values) => {
                                    setSelectedTestSetIds(values);
                                    // Clear single card selection when using multi-select
                                    if (values.length > 0) {
                                        setSelectedTestSet(null);
                                    }
                                    // Fetch với từ khóa đang active
                                    fetchTests(1, activeSearchName, values);
                                }}
                                className="w-full"
                                maxTagCount="responsive"
                                options={testSets.map(ts => ({
                                    value: ts.id,
                                    label: ts.name
                                }))}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-end gap-2">
                            <Button
                                type="primary"
                                size="large"
                                icon={<SearchOutlined />}
                                onClick={handleSearch}
                                className="min-w-[120px]"
                            >
                                Tìm kiếm
                            </Button>
                            <Button
                                size="large"
                                icon={<ClearOutlined />}
                                onClick={handleReset}
                                className="min-w-[120px]"
                            >
                                Làm mới
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tests Section */}
                <div className="mt-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Danh sách đề thi
                        </h2>
                        <p className="text-gray-600">
                            {(() => {
                                if (activeSearchName) {
                                    return `Kết quả tìm kiếm cho "${activeSearchName}"`;
                                } else if (selectedTestSetIds.length === 0) {
                                    return 'Tất cả đề thi TOEIC';
                                } else if (selectedTestSetIds.length === 1) {
                                    const testSet = testSets.find(ts => ts.id === selectedTestSetIds[0]);
                                    return `Đề thi trong bộ "${testSet?.name || ''}"`;
                                } else {
                                    return `Đề thi từ ${selectedTestSetIds.length} bộ đề đã chọn`;
                                }
                            })()}
                        </p>
                    </div>

                    {loadingTests ? (
                        <div className="py-12">
                            <Spin spinning tip="Đang tải danh sách đề thi...">
                                <div className="h-8" />
                            </Spin>
                        </div>
                    ) : tests.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {tests.map((test) => (
                                    <TestCard 
                                        key={test.id} 
                                        test={test}
                                        onClick={() => handleTestClick(test)}
                                    />
                                ))}
                            </div>
                            
                            {/* Pagination */}
                            {total > pageSize && (
                                <div className="mt-8 flex justify-center">
                                    <Pagination
                                        current={currentPage}
                                        total={total}
                                        pageSize={pageSize}
                                        onChange={handlePageChange}
                                        showSizeChanger={false}
                                        showTotal={(total, range) => 
                                            `${range[0]}-${range[1]} / ${total} đề thi`
                                        }
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                            <div className="text-6xl mb-4">🔍</div>
                            <p className="text-gray-600 text-lg font-semibold mb-2">
                                {activeSearchName 
                                    ? 'Không tìm thấy đề thi phù hợp'
                                    : selectedTestSetIds.length > 0
                                        ? 'Các bộ đề đã chọn chưa có đề thi'
                                        : 'Hiện chưa có đề thi nào'
                                }
                            </p>
                            {activeSearchName && (
                                <p className="text-gray-400 text-sm">
                                    Vui lòng thử lại với từ khóa khác
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestList;

