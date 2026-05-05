import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    getLearnerSpeakingTestById,
    getLearnerWritingTestById,
    getPublicTestById,
} from "../../api/api";
import { Modal, Select, Spin, message } from "antd";
import { useAppSelector } from "../../redux/hooks";
import HistoryTestExam from "../../components/table/HistoryTestExam";
import TestCommentSection from "../../components/exam/TestCommentSection";

const FULL_TEST_STORAGE_KEY_PREFIX = "toeic_full_test_progress_";
const FULL_TEST_SKIP_CONTINUE_PROMPT_PREFIX = "toeic_full_test_skip_continue_prompt_";

const TagChip = ({ children }) => (
    <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-800 rounded-full border border-gray-200">
        {children}
    </span>
);

const PART_QUESTION_COUNTS = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 };

const CONFIG = {
    readingListening: {
        label: "LR",
        fetchDetail: getPublicTestById,
        doPath: "/do-test",
        defaultParts: [1, 2, 3, 4, 5, 6, 7],
        fullTestMinutes: 120,
        totalQuestions: 200,
        headerNote:
            "Chú ý: để được quy đổi sang scaled score (ví dụ trên thang điểm 990 cho TOEIC hoặc 9.0 cho IELTS), vui lòng chọn chế độ làm FULL TEST.",
        sidebarTip: "📌 Mẹo: Hãy luyện tập từng phần trước khi làm Full Test để làm quen dạng câu hỏi.",
    },
    speaking: {
        label: "Speaking",
        fetchDetail: getLearnerSpeakingTestById,
        doPath: "/do-speaking-test",
        defaultParts: [1, 2, 3, 4, 5],
        fullTestMinutes: 20,
        totalQuestions: 11,
        headerNote: "Luyện tập theo phần hoặc làm bài Speaking đầy đủ để ghi nhận kết quả.",
        sidebarTip: "📌 Mẹo: Nghe kỹ từng phần trước khi làm full test Speaking.",
    },
    writing: {
        label: "Writing",
        fetchDetail: getLearnerWritingTestById,
        doPath: "/do-writing-test",
        defaultParts: [1, 2, 3],
        fullTestMinutes: 60,
        totalQuestions: 8,
        headerNote: "Luyện tập theo phần hoặc làm bài Writing đầy đủ để ghi nhận kết quả.",
        sidebarTip: "📌 Mẹo: Đọc đề và phân bổ thời gian trước khi làm full test Writing.",
    },
};

const PartSection = ({ part, checked, onChange }) => {
    const questionCount =
        part.totalQuestions ??
        part.numberOfQuestions ??
        PART_QUESTION_COUNTS[part.partId] ??
        0;
    const tags = Array.isArray(part.tagNames) ? part.tagNames : [];
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
            <div className={`flex items-center gap-2 ${tags.length > 0 ? "mb-2.5" : ""}`}>
                <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300" 
                    checked={checked}
                    onChange={(e) => onChange && onChange(part.partId, e.target.checked)}
                />
                <h3 className="text-base md:text-lg font-semibold text-gray-900 leading-snug">
                    {part.partName}
                </h3>
                {questionCount ? (
                    <span className="text-xs text-gray-400">({questionCount} câu hỏi)</span>
                ) : null}
            </div>
            {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                        <TagChip key={idx}>{tag}</TagChip>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

const TestDetail = ({ variant = "readingListening" }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const userRole = useAppSelector(state => state.account.user?.role);
    const isLearner = userRole === 'LEARNER';
    const cfg = CONFIG[variant] || CONFIG.readingListening;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('practice');
    const [selectedParts, setSelectedParts] = useState([]);
    const [timeLimit, setTimeLimit] = useState(null);

    const continuePromptShownRef = useRef(false);

    const goLogin = () => {
        const cb = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
        navigate(`/auth?callback=${cb}`);
    };

    const handlePartToggle = (partId, checked) => {
        if (checked) {
            setSelectedParts(prev => [...prev, partId]);
        } else {
            setSelectedParts(prev => prev.filter(id => id !== partId));
        }
    };

    const allPartIdsFromData = useMemo(() => {
        if (!data?.learnerPartResponses?.length) return [];
        return data.learnerPartResponses.map((p) => p.partId).filter((x) => x != null);
    }, [data]);

    // Bắt đầu luyện tập
    const handleStartPractice = () => {
        if (selectedParts.length === 0) {
            message.warning('Vui lòng chọn ít nhất một phần để luyện tập!');
            return;
        }

        navigate(cfg.doPath, {
            state: {
                testId: id,
                learnerTestType: variant,
                mode: 'practice',
                parts: selectedParts,
                // AntD Select option values must not be null. We use `-1` as "no limit"
                // and convert back to null for DoTest.
                timeLimit: timeLimit === -1 || timeLimit == null ? null : timeLimit
            }
        });
    };

    // Bắt đầu full test
    const handleStartFullTest = () => {
        const parts = allPartIdsFromData.length > 0 ? allPartIdsFromData : cfg.defaultParts;
        navigate(cfg.doPath, {
            state: {
                testId: id,
                learnerTestType: variant,
                mode: 'full',
                parts,
                timeLimit: null
            }
        });
    };


    const parsedId = useMemo(() => {
        const parsed = Number(id);
        return Number.isFinite(parsed) ? parsed : null;
    }, [id]);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!parsedId) return;
            setLoading(true);
            try {
                const res = await cfg.fetchDetail(parsedId);
                setData(res.data);
            } catch (e) {
                message.error('Không thể tải chi tiết đề thi');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [parsedId, cfg]);

    // Nếu có tiến độ full test trong localStorage thì hỏi người dùng tiếp tục
    useEffect(() => {
        if (!parsedId) return;
        if (!isAuthenticated || !isLearner) return;
        if (!data) return; // đợi khi đã load dữ liệu trang để tránh prompt "giữa chừng"
        if (continuePromptShownRef.current) return;

        continuePromptShownRef.current = true;

        const legacyKey =
            variant === "readingListening" ? `${FULL_TEST_STORAGE_KEY_PREFIX}${parsedId}` : null;
        const key = `${FULL_TEST_STORAGE_KEY_PREFIX}${variant}_${parsedId}`;
        const raw = (() => {
            try {
                if (legacyKey) {
                    const legacy = localStorage.getItem(legacyKey);
                    if (typeof legacy === "string" && legacy.trim() !== "") return legacy;
                }
                return localStorage.getItem(key);
            } catch {
                return null;
            }
        })();

        const hasProgress = typeof raw === 'string' && raw.trim() !== '';
        if (!hasProgress) return;

        const legacySkipKey =
            variant === "readingListening"
                ? `${FULL_TEST_SKIP_CONTINUE_PROMPT_PREFIX}${parsedId}`
                : null;
        const skipKey = `${FULL_TEST_SKIP_CONTINUE_PROMPT_PREFIX}${variant}_${parsedId}`;
        const parts = allPartIdsFromData.length > 0 ? allPartIdsFromData : cfg.defaultParts;

        Modal.confirm({
            title: 'Tiếp tục làm bài',
            content: 'Bạn đang làm dở bài test này. Có muốn tiếp tục làm không?',
            okText: 'Có',
            cancelText: 'Không',
            okType: 'primary',
            onOk: () => {
                // Đánh dấu để DoTest không hiển thị lại modal "tiếp tục"
                try {
                    sessionStorage.setItem(skipKey, '1');
                    if (legacySkipKey) sessionStorage.setItem(legacySkipKey, "1");
                } catch {
                    // không sao
                }

                navigate(cfg.doPath, {
                    state: {
                        testId: parsedId,
                        learnerTestType: variant,
                        mode: 'full',
                        parts,
                        timeLimit: null,
                    },
                });
            },
            onCancel: () => {
                // Đúng yêu cầu: chỉ xóa localStorage và đóng modal
                try {
                    localStorage.removeItem(key);
                    if (legacyKey) localStorage.removeItem(legacyKey);
                } catch {
                    // không sao
                }

                try {
                    sessionStorage.removeItem(skipKey);
                    if (legacySkipKey) sessionStorage.removeItem(legacySkipKey);
                } catch {
                    // không sao
                }
            },
        });
    }, [parsedId, isAuthenticated, isLearner, data, navigate, variant, cfg, allPartIdsFromData]);

    if (loading) {
        return <Spin size="large" fullscreen tip="Đang tải chi tiết đề thi..." />;
    }

    if (!data) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center text-gray-600">Không tìm thấy đề thi</div>
            </div>
        );
    }

    const learnersCount = Number(
        data.numberOfLearnedTests ?? data.numberOfLearnerTests ?? 0,
    ).toLocaleString();

    const parts = data.learnerPartResponses || [];
    const partCount = parts.length || cfg.defaultParts.length;

    const durationMinutes = (() => {
        const fromApi = Number(data.durationMinutes);
        if (Number.isFinite(fromApi) && fromApi > 0) return fromApi;
        return cfg.fullTestMinutes;
    })();

    const totalQuestions = (() => {
        if (variant === "readingListening") return cfg.totalQuestions;
        const fromParts =
            parts.reduce((sum, p) => {
                const n =
                    p.totalQuestions ??
                    p.numberOfQuestions ??
                    PART_QUESTION_COUNTS[p.partId] ??
                    0;
                return sum + Number(n || 0);
            }, 0) || 0;
        if (fromParts > 0) return fromParts;
        return cfg.totalQuestions;
    })();

    return (
        <div className="min-h-screen bg-white">
            {/* Page header */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                    {data.testName}
                </h1>
                <div className="mt-4 text-gray-700">
                    <p className="mt-1 text-sm italic text-rose-600">{cfg.headerNote}</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 mb-14">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left/Main */}
                    <div className="lg:col-span-2">
                        {/* Results table */}
                        <HistoryTestExam
                            testId={parsedId}
                            isAuthenticated={isAuthenticated}
                            variant={variant === "readingListening" ? undefined : variant}
                        />

                        

                        {/* Tabs */}
                        <div className="mt-6 bg-white border border-gray-200 rounded-xl">
                                <div className="px-5 pt-4">
                                <div className="flex gap-8 border-b border-gray-200">
                                    {['practice', 'full'].map(key => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setActiveTab(key);
                                                // Reset selected parts khi chuyển tab
                                                if (key === 'full') {
                                                    setSelectedParts([]);
                                                    setTimeLimit(null);
                                                }
                                            }}
                                            className={`py-3 text-sm font-medium ${activeTab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
                                        >
                                            {key === 'practice' ? 'Luyện tập' : 'Làm full test'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-5 md:p-6">
                                {activeTab === 'practice' && (
                                    <>
                                        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-800 p-3 text-sm">💡 Pro tips: Hình thức luyện tập từng phần và chọn mức thời gian phù hợp sẽ giúp bạn tập trung vào giải đúng các câu hỏi.</div>
                                        <div className="space-y-2">
                                            {(data.learnerPartResponses || []).map((part) => (
                                                <PartSection 
                                                    key={part.partId} 
                                                    part={part}
                                                    checked={selectedParts.includes(part.partId)}
                                                    onChange={handlePartToggle}
                                                />
                                            ))}
                                        </div>
                                        {/* Time limit for practice - gated by auth */}
                                        <div className="mt-6">
                                            {isAuthenticated ? (
                                                isLearner ? (
                                                <div className="mt-4 grid grid-cols-1 gap-3 md:mt-0 md:grid-cols-[1fr_auto] md:items-end md:gap-4">
                                                    <div className="min-w-0">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Giới hạn thời gian (tùy chọn)
                                                        </label>
                                                        <Select
                                                            placeholder="-- Không giới hạn --"
                                                            className="w-full"
                                                            value={timeLimit}
                                                            onChange={setTimeLimit}
                                                            options={[
                                                                { value: -1, label: "-- Không giới hạn --" },
                                                                ...Array.from({ length: 36 }, (_, i) => {
                                                                    const minutes = (i + 1) * 5;
                                                                    return { value: minutes, label: `${minutes} phút` };
                                                                }),
                                                            ]}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleStartPractice}
                                                        className="h-[40px] w-full md:w-auto whitespace-nowrap rounded-lg bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700"
                                                    >
                                                        BẮT ĐẦU LUYỆN TẬP
                                                    </button>
                                                </div>
                                                ) : null
                                            ) : (
                                                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                                                    <div className="text-gray-700">Đăng nhập để đặt thời gian và lưu tiến độ luyện tập.</div>
                                                    <button onClick={goLogin} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Đăng nhập ngay</button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                {activeTab === 'full' && (
                                    <>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm">
                                            ⚠️ Sẵn sàng để bắt đầu làm full test? Để đạt được kết quả tốt nhất,
                                            bạn cần dành ra {cfg.fullTestMinutes} phút cho bài test này.
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            {isAuthenticated ? (
                                                isLearner ? (
                                                <button 
                                                    onClick={handleStartFullTest}
                                                    className="h-[40px] w-full md:w-auto whitespace-nowrap rounded-lg bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700"
                                                >
                                                    BẮT ĐẦU THI
                                                </button>
                                                ) : null
                                            ) : (
                                                <div className="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                                                    <div className="text-gray-700">Bạn cần đăng nhập để làm full test.</div>
                                                    <button onClick={goLogin} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Đăng nhập ngay</button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                            </div>
                        </div>

                        {/* Comment Section - đặt dưới cùng */}
                        <TestCommentSection testId={parsedId} isAuthenticated={isAuthenticated} />
                    </div>

                    {/* Right/Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-6 space-y-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Số lượt thi</div>
                                        <div className="text-lg font-semibold text-gray-900">{learnersCount}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Thời lượng</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {durationMinutes ? `${durationMinutes} phút` : "—"}
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Số phần</div>
                                        <div className="text-lg font-semibold text-gray-900">{partCount}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">
                                            Câu hỏi
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {totalQuestions ? totalQuestions : "—"}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                                    {cfg.sidebarTip}
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestDetail;

