import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    getLearnerSpeakingTestById,
    getLearnerWritingTestById,
} from "../../api/api";
import { Spin, Select, message, Modal } from "antd";
import { useAppSelector } from "../../redux/hooks";
import HistoryTestExam from "../../components/table/HistoryTestExam";
import TestCommentSection from "../../components/exam/TestCommentSection";

const FULL_TEST_STORAGE_PREFIX = "toeic_full_test_progress_";
const FULL_TEST_SKIP_PREFIX = "toeic_full_test_skip_continue_prompt_";

const TagChip = ({ children }) => (
    <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-800 rounded-full border border-gray-200">
        {children}
    </span>
);

/** Fallback question counts when API does not send per-part totals (TOEIC L&R style). */
const PART_QUESTION_COUNTS = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 };

const PartSection = ({ part, checked, onChange }) => {
    const questionCount =
        part.totalQuestions ??
        part.numberOfQuestions ??
        PART_QUESTION_COUNTS[part.partId] ??
        0;
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
                <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300"
                    checked={checked}
                    onChange={(e) => onChange && onChange(part.partId, e.target.checked)}
                />
                <h3 className="text-base md:text-lg font-semibold text-gray-900">{part.partName}</h3>
                <span className="text-xs text-gray-400">
                    ({questionCount ? `${questionCount} câu hỏi` : "—"})
                </span>
            </div>
            <div className="flex flex-wrap gap-2">
                {(part.tagNames || []).map((tag, idx) => (
                    <TagChip key={idx}>{tag}</TagChip>
                ))}
            </div>
        </div>
    );
};

const fetchTestDetail = (variant, id) => {
    if (variant === "writing") return getLearnerWritingTestById(id);
    return getLearnerSpeakingTestById(id);
};

const LABEL = { speaking: "Speaking", writing: "Writing" };

/**
 * Full learner test detail (duplicate of online TestDetail) for Speaking / Writing APIs.
 */
const LearnerTypedTestDetail = ({ variant }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useAppSelector((state) => state.account.isAuthenticated);
    const userRole = useAppSelector((state) => state.account.user?.role);
    const isLearner = userRole === "LEARNER";

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("practice");
    const [selectedParts, setSelectedParts] = useState([]);
    const [timeLimit, setTimeLimit] = useState(null);

    const continuePromptShownRef = useRef(false);

    const storageKeyFull = `${FULL_TEST_STORAGE_PREFIX}${variant}_${id}`;
    const storageKeySkip = `${FULL_TEST_SKIP_PREFIX}${variant}_${id}`;

    const goLogin = () => {
        const cb = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
        navigate(`/auth?callback=${cb}`);
    };

    const handlePartToggle = (partId, checked) => {
        if (checked) {
            setSelectedParts((prev) => [...prev, partId]);
        } else {
            setSelectedParts((prev) => prev.filter((pid) => pid !== partId));
        }
    };

    const allPartIdsFromData = useMemo(() => {
        if (!data?.learnerPartResponses?.length) return [];
        return data.learnerPartResponses.map((p) => p.partId).filter((x) => x != null);
    }, [data]);

    const handleStartPractice = () => {
        if (selectedParts.length === 0) {
            message.warning("Vui lòng chọn ít nhất một phần để luyện tập!");
            return;
        }

        navigate(
            variant === "speaking"
                ? "/do-speaking-test"
                : variant === "writing"
                  ? "/do-writing-test"
                  : "/do-test",
            {
            state: {
                testId: id,
                learnerTestType: variant,
                mode: "practice",
                parts: selectedParts,
                timeLimit: timeLimit === -1 || timeLimit == null ? null : timeLimit,
            },
            },
        );
    };

    const handleStartFullTest = () => {
        const defaultParts =
            variant === "speaking"
                ? [1, 2, 3, 4, 5]
                : variant === "writing"
                  ? [1, 2, 3]
                  : [1, 2, 3, 4, 5, 6, 7];
        const parts = allPartIdsFromData.length > 0 ? allPartIdsFromData : defaultParts;
        navigate(
            variant === "speaking"
                ? "/do-speaking-test"
                : variant === "writing"
                  ? "/do-writing-test"
                  : "/do-test",
            {
            state: {
                testId: id,
                learnerTestType: variant,
                mode: "full",
                parts,
                timeLimit: null,
            },
            },
        );
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
                const res = await fetchTestDetail(variant, parsedId);
                setData(res.data);
            } catch (e) {
                message.error("Không thể tải chi tiết đề thi");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [parsedId, variant]);

    useEffect(() => {
        if (!parsedId) return;
        if (!isAuthenticated || !isLearner) return;
        if (!data) return;
        if (continuePromptShownRef.current) return;

        continuePromptShownRef.current = true;

        const key = storageKeyFull;
        const raw = (() => {
            try {
                return localStorage.getItem(key);
            } catch {
                return null;
            }
        })();

        const hasProgress = typeof raw === "string" && raw.trim() !== "";
        if (!hasProgress) return;

        const skipKey = storageKeySkip;
        const defaultParts =
            variant === "speaking"
                ? [1, 2, 3, 4, 5]
                : variant === "writing"
                  ? [1, 2, 3]
                  : [1, 2, 3, 4, 5, 6, 7];
        const parts = allPartIdsFromData.length > 0 ? allPartIdsFromData : defaultParts;

        Modal.confirm({
            title: "Tiếp tục làm bài",
            content: "Bạn đang làm dở bài test này. Có muốn tiếp tục làm không?",
            okText: "Có",
            cancelText: "Không",
            okType: "primary",
            onOk: () => {
                try {
                    sessionStorage.setItem(skipKey, "1");
                } catch {
                    // ignore
                }

                navigate(
                    variant === "speaking"
                        ? "/do-speaking-test"
                        : variant === "writing"
                          ? "/do-writing-test"
                          : "/do-test",
                    {
                    state: {
                        testId: parsedId,
                        learnerTestType: variant,
                        mode: "full",
                        parts,
                        timeLimit: null,
                    },
                    },
                );
            },
            onCancel: () => {
                try {
                    localStorage.removeItem(key);
                } catch {
                    // ignore
                }
                try {
                    sessionStorage.removeItem(skipKey);
                } catch {
                    // ignore
                }
            },
        });
    }, [
        parsedId,
        isAuthenticated,
        isLearner,
        data,
        navigate,
        variant,
        storageKeyFull,
        storageKeySkip,
        allPartIdsFromData,
    ]);

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
    const partCount = parts.length;
    const totalQuestions = parts.reduce((sum, p) => {
        const n =
            p.totalQuestions ??
            p.numberOfQuestions ??
            PART_QUESTION_COUNTS[p.partId] ??
            0;
        return sum + n;
    }, 0);

    const durationLabel =
        data.durationMinutes != null ? `${data.durationMinutes} phút` : "—";

    const headerNote =
        variant === "speaking"
            ? "Luyện tập theo phần hoặc làm bài Speaking đầy đủ để ghi nhận kết quả."
            : "Luyện tập theo phần hoặc làm bài Writing đầy đủ để ghi nhận kết quả.";

    const sidebarTip =
        variant === "speaking"
            ? "📌 Mẹo: Nghe kỹ từng phần trước khi làm full test Speaking."
            : "📌 Mẹo: Đọc đề và phân bổ thời gian trước khi làm full test Writing.";

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                    {data.testName}
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                    {LABEL[variant]} · {data.testSetName ? `Bộ: ${data.testSetName}` : ""}
                </p>
                <div className="mt-4 text-gray-700">
                    <p className="mt-1 text-sm italic text-rose-600">{headerNote}</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 mb-14">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <HistoryTestExam
                            testId={parsedId}
                            isAuthenticated={isAuthenticated}
                            variant={variant}
                        />

                        <div className="mt-6 bg-white border border-gray-200 rounded-xl">
                            <div className="px-5 pt-4">
                                <div className="flex gap-8 border-b border-gray-200">
                                    {["practice", "full"].map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(key);
                                                if (key === "full") {
                                                    setSelectedParts([]);
                                                    setTimeLimit(null);
                                                }
                                            }}
                                            className={`py-3 text-sm font-medium ${
                                                activeTab === key
                                                    ? "text-blue-600 border-b-2 border-blue-600"
                                                    : "text-gray-600 hover:text-gray-800"
                                            }`}
                                        >
                                            {key === "practice" ? "Luyện tập" : "Làm full test"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-5 md:p-6">
                                {activeTab === "practice" && (
                                    <>
                                        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-800 p-3 text-sm">
                                            💡 Chọn một hoặc nhiều phần để luyện; có thể đặt giới hạn thời
                                            gian (tùy chọn).
                                        </div>
                                        <div className="space-y-3">
                                            {parts.map((part) => (
                                                <PartSection
                                                    key={part.partId}
                                                    part={part}
                                                    checked={selectedParts.includes(part.partId)}
                                                    onChange={handlePartToggle}
                                                />
                                            ))}
                                        </div>
                                        <div className="mt-6">
                                            {isAuthenticated ? (
                                                isLearner ? (
                                                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                                                        <div className="flex-1">
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Giới hạn thời gian (tùy chọn)
                                                            </label>
                                                            <Select
                                                                placeholder="-- Không giới hạn --"
                                                                className="w-full"
                                                                value={timeLimit}
                                                                onChange={setTimeLimit}
                                                                options={[
                                                                    {
                                                                        value: -1,
                                                                        label: "-- Không giới hạn --",
                                                                    },
                                                                    ...Array.from(
                                                                        { length: 36 },
                                                                        (_, i) => {
                                                                            const minutes = (i + 1) * 5;
                                                                            return {
                                                                                value: minutes,
                                                                                label: `${minutes} phút`,
                                                                            };
                                                                        },
                                                                    ),
                                                                ]}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleStartPractice}
                                                            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                                        >
                                                            BẮT ĐẦU LUYỆN TẬP
                                                        </button>
                                                    </div>
                                                ) : null
                                            ) : (
                                                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                                                    <div className="text-gray-700">
                                                        Đăng nhập để đặt thời gian và lưu tiến độ luyện tập.
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={goLogin}
                                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                                    >
                                                        Đăng nhập ngay
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                {activeTab === "full" && (
                                    <>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm">
                                            ⚠️ Bạn sẽ làm toàn bộ các phần của đề {LABEL[variant]} trong một
                                            lượt. Hãy đảm bảo bạn đã sẵn sàng.
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            {isAuthenticated ? (
                                                isLearner ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleStartFullTest}
                                                        className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                                    >
                                                        BẮT ĐẦU THI
                                                    </button>
                                                ) : null
                                            ) : (
                                                <div className="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                                                    <div className="text-gray-700">
                                                        Bạn cần đăng nhập để làm full test.
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={goLogin}
                                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                                    >
                                                        Đăng nhập ngay
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <TestCommentSection testId={parsedId} isAuthenticated={isAuthenticated} />
                    </div>

                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-6 space-y-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Số lượt thi</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {learnersCount}
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Thời lượng (gợi ý)</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {durationLabel}
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Số phần</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {partCount || "—"}
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Câu hỏi (ước lượng)</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {totalQuestions || "—"}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                                    {sidebarTip}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearnerTypedTestDetail;
