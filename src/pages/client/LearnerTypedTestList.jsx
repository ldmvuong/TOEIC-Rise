import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import {
    getLearnerSpeakingTestSets,
    getLearnerSpeakingTests,
    getLearnerWritingTestSets,
    getLearnerWritingTests,
} from "../../api/api";
import TestSetCard from "../../components/card/testset.card.jsx";
import TestCard from "../../components/card/test.card.jsx";
import { Spin, message, Pagination, Input, Select, Button } from "antd";
import { SearchOutlined, ClearOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { toSlug } from "../../utils/slug";

const CONFIG = {
    speaking: {
        title: "Đề thi Speaking",
        subtitle: "Chọn bộ đề và đề thi Speaking để luyện tập",
        fetchSets: getLearnerSpeakingTestSets,
        fetchTests: getLearnerSpeakingTests,
        basePath: "/speaking-tests",
        loadSetsError: "Không thể tải danh sách bộ đề Speaking",
        loadTestsError: "Không thể tải danh sách đề Speaking",
    },
    writing: {
        title: "Đề thi Writing",
        subtitle: "Chọn bộ đề và đề thi Writing để luyện tập",
        fetchSets: getLearnerWritingTestSets,
        fetchTests: getLearnerWritingTests,
        basePath: "/writing-tests",
        loadSetsError: "Không thể tải danh sách bộ đề Writing",
        loadTestsError: "Không thể tải danh sách đề Writing",
    },
};

/**
 * Browse test sets + tests for learner Speaking or Writing (same UX as Đề thi online).
 */
const LearnerTypedTestList = ({ variant }) => {
    const cfg = CONFIG[variant] || CONFIG.speaking;

    const [testSets, setTestSets] = useState([]);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTests, setLoadingTests] = useState(false);
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(12);
    const [total, setTotal] = useState(0);

    const [searchName, setSearchName] = useState("");
    const [activeSearchName, setActiveSearchName] = useState("");
    const [selectedTestSetIds, setSelectedTestSetIds] = useState([]);

    useEffect(() => {
        fetchTestSets();
        fetchTests(1, "", []);
    }, [variant]);

    const fetchTestSets = async () => {
        try {
            const response = await cfg.fetchSets();
            setTestSets(response.data || []);
        } catch (error) {
            message.error(cfg.loadSetsError);
        }
    };

    const fetchTests = async (page = 1, search = "", selectedIds = []) => {
        setLoadingTests(true);
        try {
            let query = `page=${page - 1}&size=${pageSize}`;

            if (selectedIds.length > 0) {
                query += `&sort=${selectedIds.join(",")}`;
            }

            if (search && search.trim()) {
                query += `&name=${encodeURIComponent(search.trim())}`;
            }

            const response = await cfg.fetchTests(query);
            setTests(response.data?.result || []);
            setTotal(response.data?.meta?.total || 0);
            setCurrentPage(page);
        } catch (error) {
            message.error(cfg.loadTestsError);
        } finally {
            setLoadingTests(false);
            setLoading(false);
        }
    };

    const handleTestSetClick = (testSet) => {
        if (selectedTestSetIds.includes(testSet.id)) {
            const newIds = selectedTestSetIds.filter((tid) => tid !== testSet.id);
            setSelectedTestSetIds(newIds);
            fetchTests(1, activeSearchName, newIds);
        } else {
            const newIds = [...selectedTestSetIds, testSet.id];
            setSelectedTestSetIds(newIds);
            fetchTests(1, activeSearchName, newIds);
        }
    };

    const handlePageChange = (page) => {
        fetchTests(page, activeSearchName, selectedTestSetIds);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSearch = () => {
        setActiveSearchName(searchName);
        fetchTests(1, searchName, selectedTestSetIds);
    };

    const handleReset = () => {
        setSearchName("");
        setActiveSearchName("");
        setSelectedTestSetIds([]);
        fetchTests(1, "", []);
    };

    const handleTestClick = (test) => {
        if (!test?.id) return;
        const slug = toSlug(test?.testName || "test");
        navigate(`${cfg.basePath}/${test.id}/${slug}`);
    };

    if (loading) {
        return (
            <Spin size="large" fullscreen tip="Đang tải..." />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        {cfg.title}
                    </h1>
                    <p className="text-gray-600">{cfg.subtitle}</p>
                </div>

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
                                                ? "ring-2 ring-blue-500 rounded-lg"
                                                : ""
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
                            Hiện chưa có bộ đề nào
                        </p>
                    </div>
                )}

                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row gap-4">
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

                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Bộ đề
                            </label>
                            <Select
                                mode="multiple"
                                size="large"
                                placeholder="Chọn bộ đề..."
                                value={selectedTestSetIds}
                                onChange={(values) => {
                                    setSelectedTestSetIds(values);
                                    fetchTests(1, activeSearchName, values);
                                }}
                                className="w-full"
                                maxTagCount="responsive"
                                options={testSets.map((ts) => ({
                                    value: ts.id,
                                    label: ts.name,
                                }))}
                            />
                        </div>

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

                <div className="mt-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Danh sách đề thi
                        </h2>
                        <p className="text-gray-600">
                            {(() => {
                                if (activeSearchName) {
                                    return `Kết quả tìm kiếm cho "${activeSearchName}"`;
                                }
                                if (selectedTestSetIds.length === 0) {
                                    return `Tất cả đề ${variant === "speaking" ? "Speaking" : "Writing"}`;
                                }
                                if (selectedTestSetIds.length === 1) {
                                    const ts = testSets.find(
                                        (t) => t.id === selectedTestSetIds[0],
                                    );
                                    return `Đề trong bộ "${ts?.name || ""}"`;
                                }
                                return `Đề từ ${selectedTestSetIds.length} bộ đã chọn`;
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

                            {total > pageSize && (
                                <div className="mt-8 flex justify-center">
                                    <Pagination
                                        current={currentPage}
                                        total={total}
                                        pageSize={pageSize}
                                        onChange={handlePageChange}
                                        showSizeChanger={false}
                                        showTotal={(t, range) =>
                                            `${range[0]}-${range[1]} / ${t} đề thi`
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
                                    ? "Không tìm thấy đề phù hợp"
                                    : selectedTestSetIds.length > 0
                                      ? "Các bộ đề đã chọn chưa có đề thi"
                                      : "Hiện chưa có đề thi nào"}
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

export default LearnerTypedTestList;
