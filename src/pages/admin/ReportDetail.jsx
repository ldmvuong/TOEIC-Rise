import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import { getReportById, updateQuestionReport } from "@/api/api";
import { Spin, Tag, Button, Descriptions, Alert, Input, Radio, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import parse from "html-react-parser";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import TagsSelector from "@/components/admin/TagsSelector";

const reasonLabels = {
    WRONG_ANSWER: "Đáp án sai",
    TYPO: "Lỗi chính tả",
    WRONG_EXPLANATION: "Giải thích sai",
    INCORRECT_CONTENT: "Nội dung không chính xác",
    MISSING_MEDIA: "Thiếu file đính kèm",
    OFFENSIVE_CONTENT: "Nội dung phản cảm",
    OTHER: "Lý do khác",
};

const statusColor = {
    PENDING: "orange",
    REVIEWING: "blue",
    RESOLVED: "green",
    REJECTED: "red",
};

const ReportDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.account.user);
    const isAdmin = user?.role === "ADMIN";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [report, setReport] = useState(null);

    // Resolve form
    const [status, setStatus] = useState("RESOLVED");
    const [resolvedNote, setResolvedNote] = useState("");

    // Edit flags
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [isEditingQuestion, setIsEditingQuestion] = useState(false);

    // Question group editable fields
    const [groupAudioUrl, setGroupAudioUrl] = useState("");
    const [groupImageUrl, setGroupImageUrl] = useState("");
    const [groupPassage, setGroupPassage] = useState("");
    const [groupTranscript, setGroupTranscript] = useState("");

    // Question editable fields
    const [qContent, setQContent] = useState("");
    const [qOptions, setQOptions] = useState(["", "", "", ""]);
    const [qCorrect, setQCorrect] = useState("A");
    const [qExplanation, setQExplanation] = useState("");
    const [questionTagsState, setQuestionTagsState] = useState([]);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            setLoading(true);
            setError("");
            try {
                const res = await getReportById(id, isAdmin);
                const data = res?.data ?? null;
                setReport(data);
                if (data) {
                    setStatus(data.status || "RESOLVED");
                    setResolvedNote(data.resolvedNote || "");
                    setGroupAudioUrl(data.questionGroupAudioUrl || "");
                    setGroupImageUrl(data.questionGroupImageUrl || "");
                    setGroupPassage(data.questionGroupPassage || "");
                    setGroupTranscript(data.questionGroupTranscript || "");
                    setQContent(data.questionContent || "");
                    const opts = Array.isArray(data.questionOptions) ? [...data.questionOptions] : [];
                    while (opts.length < 4) opts.push("");
                    setQOptions(opts.slice(0, 4).map((o) => o || ""));
                    setQCorrect(data.questionCorrectOption || "A");
                    setQExplanation(data.questionExplanation || "");
                    setQuestionTagsState(
                        Array.isArray(data.questionTags)
                            ? data.questionTags.map((t, idx) => ({
                                  id: idx,
                                  name: typeof t === "string" ? t : t?.name || ""
                              })).filter((t) => t.name)
                            : []
                    );
                }
            } catch (err) {
                setError(err?.response?.data?.message || err?.message || "Không thể tải báo cáo");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, isAdmin]);

    const partNumber = useMemo(() => {
        if (!report?.partName) return null;
        const num = parseInt((report.partName.match(/\d+/) || [])[0], 10);
        return Number.isNaN(num) ? null : num;
    }, [report?.partName]);

    const partShowsAudio = partNumber ? [1, 2, 3, 4].includes(partNumber) : true;
    const partShowsImage = partNumber ? [1, 4, 7].includes(partNumber) : true;
    const partShowsPassage = partNumber ? [6, 7].includes(partNumber) : false;
    const partShowsTranscript = partNumber === 5 ? false : true;

    const handleSaveResolve = async () => {
        if (!id) return;
        if (!resolvedNote.trim()) {
            message.error("Vui lòng nhập Note (resolvedNote)");
            return;
        }

        const payload = {
            status,
            resolvedNote: resolvedNote.trim(),
            questionGroupUpdate: isEditingGroup
                ? {
                      audioUrl: partShowsAudio ? groupAudioUrl || null : null,
                      imageUrl: partShowsImage ? groupImageUrl || null : null,
                      passage: partShowsPassage ? groupPassage || null : null,
                      transcript: partShowsTranscript ? groupTranscript || null : null,
                  }
                : null,
            questionUpdate: isEditingQuestion
                ? {
                      id: report?.questionId,
                      questionGroupId: report?.questionGroupId,
                      content: qContent || "",
                      options: qOptions.map((o) => (o && o.trim() !== "" ? o : null)),
                      correctOption: qCorrect,
                      explanation: qExplanation || "",
                      tags: questionTagsState.map((t) => t.name).join("; "),
                  }
                : null,
        };

        try {
            await updateQuestionReport(id, payload);
            message.success("Cập nhật báo cáo thành công");
            const res = await getReportById(id, isAdmin);
            const data = res?.data ?? null;
            setReport(data);
            setIsEditingGroup(false);
            setIsEditingQuestion(false);
        } catch (err) {
            message.error(err?.response?.data?.message || err?.message || "Không thể cập nhật báo cáo");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="p-4">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(-1)}
                    className="mb-4"
                >
                    Quay lại
                </Button>
                <Alert type="error" message={error || "Không tìm thấy báo cáo"} />
            </div>
        );
    }

    const {
        questionReportId,
        reporterFullName,
        reporterEmail,
        resolverFullName,
        resolverEmail,
        status: reportStatus,
        description,
        reasons,
        partName,
        questionId,
        questionContent,
        questionOptions = [],
        questionCorrectOption,
        questionExplanation,
        questionTags = [],
        questionGroupAudioUrl,
        questionGroupImageUrl,
        questionGroupPassage,
        questionGroupTranscript,
    } = report;

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition"
                    title="Quay lại"
                >
                    <ArrowLeftOutlined className="text-lg" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900">Chi tiết báo cáo</h1>
                    <div className="mt-1 text-sm text-gray-500">
                        ID: {questionReportId || id} • Phần: {partName || "N/A"}
                    </div>
                </div>
                <Button type="primary" onClick={handleSaveResolve}>
                    Lưu xử lý
                </Button>
            </div>

            {/* Reporter / Resolver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Người báo cáo</h2>
                    </div>
                    <div className="p-6">
                        <Descriptions column={1} size="middle" bordered>
                            <Descriptions.Item label="Họ tên">{reporterFullName || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Email">{reporterEmail || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Lý do">
                                <div className="flex flex-wrap gap-2">
                                    {Array.isArray(reasons) && reasons.length > 0 ? (
                                        reasons.map((r, idx) => (
                                            <Tag key={idx} color="blue">
                                                {reasonLabels[r] || r}
                                            </Tag>
                                        ))
                                    ) : (
                                        <span>-</span>
                                    )}
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Mô tả">
                                {description ? (
                                    <div className="whitespace-pre-line text-gray-700">{description}</div>
                                ) : (
                                    "-"
                                )}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Người xử lý</h2>
                    </div>
                    <div className="p-6">
                        <Descriptions column={1} size="middle" bordered>
                            <Descriptions.Item label="Họ tên">
                                {resolverFullName || <Tag>Chưa có</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">
                                {resolverEmail || <Tag>Chưa có</Tag>}
                            </Descriptions.Item>
                        <Descriptions.Item label="Note">
                            {report.resolvedNote ? (
                                <div className="whitespace-pre-line text-gray-700">
                                    {report.resolvedNote}
                                </div>
                            ) : (
                                "-"
                            )}
                        </Descriptions.Item>
                        </Descriptions>
                    </div>
                </div>
            </div>

            {/* Resolve actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Xử lý báo cáo</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Trạng thái</div>
                        <Radio.Group value={status} onChange={(e) => setStatus(e.target.value)}>
                            <Radio value="RESOLVED">RESOLVED</Radio>
                            <Radio value="REJECTED">REJECTED</Radio>
                        </Radio.Group>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Note</div>
                        <Input.TextArea
                            rows={3}
                            value={resolvedNote}
                            onChange={(e) => setResolvedNote(e.target.value)}
                            placeholder="Nhập ghi chú xử lý"
                        />
                    </div>
                </div>
            </div>

            {/* Question Group info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Thông tin nhóm câu hỏi</h2>
                    <div className="flex gap-2">
                        {!isEditingGroup ? (
                            <Button onClick={() => setIsEditingGroup(true)}>Chỉnh sửa</Button>
                        ) : (
                            <Button onClick={() => setIsEditingGroup(false)}>Hủy</Button>
                        )}
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    {!isEditingGroup ? (
                        <>
                            {/* Audio - Part 1, 2, 3, 4 */}
                            {questionGroupAudioUrl && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Audio
                                    </div>
                                    <audio controls className="w-full">
                                        <source src={questionGroupAudioUrl} type="audio/mpeg" />
                                        Trình duyệt của bạn không hỗ trợ phát audio.
                                    </audio>
                                </div>
                            )}

                            {/* Image - Part 1, 4, 7 */}
                            {questionGroupImageUrl && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        Hình ảnh
                                    </div>
                                    <div className="w-full flex justify-center bg-gray-50 rounded-lg p-4">
                                        <img
                                            src={questionGroupImageUrl}
                                            alt="Question group"
                                            className="max-h-96 object-contain rounded-lg border border-gray-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Passage - Part 6, 7 only */}
                            {questionGroupPassage && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Đoạn văn
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm leading-relaxed">
                                        {parse(questionGroupPassage)}
                                    </div>
                                </div>
                            )}

                            {/* Transcript - Always required */}
                            {questionGroupTranscript && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        Transcript
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm leading-relaxed">
                                        {parse(questionGroupTranscript)}
                                    </div>
                                </div>
                            )}

                            {!questionGroupAudioUrl && !questionGroupImageUrl && !questionGroupPassage && !questionGroupTranscript && (
                                <div className="text-center text-gray-400 py-8">
                                    Không có thông tin media hoặc transcript
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {partShowsAudio && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Audio URL</div>
                                    <Input
                                        placeholder="Nhập URL audio"
                                        value={groupAudioUrl}
                                        onChange={(e) => setGroupAudioUrl(e.target.value)}
                                    />
                                </div>
                            )}

                            {partShowsImage && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Image URL</div>
                                    <Input
                                        placeholder="Nhập URL hình ảnh"
                                        value={groupImageUrl}
                                        onChange={(e) => setGroupImageUrl(e.target.value)}
                                    />
                                </div>
                            )}

                            {partShowsPassage && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Đoạn văn</div>
                                    <div className="ckeditor-wrapper" style={{ minHeight: "300px" }}>
                                        <style>{`
                                            .ckeditor-wrapper .ck-editor__editable {
                                                min-height: 200px !important;
                                            }
                                            .ckeditor-wrapper .ck-editor {
                                                min-height: 300px;
                                            }
                                        `}</style>
                                        <CKEditor
                                            editor={ClassicEditor}
                                            data={groupPassage}
                                            config={{
                                                licenseKey: "GPL",
                                                toolbar: [
                                                    "heading",
                                                    "|",
                                                    "bold",
                                                    "italic",
                                                    "|",
                                                    "numberedList",
                                                    "bulletedList",
                                                    "|",
                                                    "link",
                                                    "insertTable",
                                                    "blockQuote",
                                                    "|",
                                                    "undo",
                                                    "redo",
                                                ],
                                                table: {
                                                    contentToolbar: [
                                                        "tableColumn",
                                                        "tableRow",
                                                        "mergeTableCells",
                                                    ],
                                                },
                                            }}
                                            onChange={(event, editor) => {
                                                const data = editor.getData();
                                                setGroupPassage(data);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {partShowsTranscript && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Transcript</div>
                                    <div className="ckeditor-wrapper" style={{ minHeight: "300px" }}>
                                        <style>{`
                                            .ckeditor-wrapper .ck-editor__editable {
                                                min-height: 200px !important;
                                            }
                                            .ckeditor-wrapper .ck-editor {
                                                min-height: 300px;
                                            }
                                        `}</style>
                                        <CKEditor
                                            editor={ClassicEditor}
                                            data={groupTranscript}
                                            config={{
                                                licenseKey: "GPL",
                                                toolbar: [
                                                    "heading",
                                                    "|",
                                                    "bold",
                                                    "italic",
                                                    "|",
                                                    "numberedList",
                                                    "bulletedList",
                                                    "|",
                                                    "link",
                                                    "insertTable",
                                                    "blockQuote",
                                                    "|",
                                                    "undo",
                                                    "redo",
                                                ],
                                                table: {
                                                    contentToolbar: [
                                                        "tableColumn",
                                                        "tableRow",
                                                        "mergeTableCells",
                                                    ],
                                                },
                                            }}
                                            onChange={(event, editor) => {
                                                const data = editor.getData();
                                                setGroupTranscript(data);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Question info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Câu hỏi {questionId ? `#${questionId}` : ""}
                    </h2>
                    <div className="flex gap-2">
                        {!isEditingQuestion ? (
                            <Button onClick={() => setIsEditingQuestion(true)}>Chỉnh sửa</Button>
                        ) : (
                            <Button onClick={() => setIsEditingQuestion(false)}>Hủy</Button>
                        )}
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    {!isEditingQuestion ? (
                        <>
                            {/* Tags */}
                            {Array.isArray(questionTags) && questionTags.length > 0 && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-2">Tags</div>
                                    <div className="flex flex-wrap gap-2">
                                        {questionTags.map((tag, idx) => (
                                            <Tag key={idx} color="blue" className="text-xs">
                                                {tag}
                                            </Tag>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Question Content */}
                            {questionContent && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3">Nội dung câu hỏi</div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-800">
                                        {parse(questionContent)}
                                    </div>
                                </div>
                            )}

                            {/* Options */}
                            {Array.isArray(questionOptions) && questionOptions.length > 0 && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3">Đáp án</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {questionOptions.map((opt, idx) => {
                                            const label = String.fromCharCode(65 + idx);
                                            const isCorrect = questionCorrectOption === label;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`px-3 py-2 rounded-lg border ${
                                                        isCorrect
                                                            ? "bg-green-50 border-green-300"
                                                            : "bg-white border-gray-300"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span
                                                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 ${
                                                                isCorrect
                                                                    ? "bg-green-600 text-white"
                                                                    : "bg-gray-300 text-gray-700"
                                                            }`}
                                                        >
                                                            {label}
                                                        </span>
                                                        <span
                                                            className={`text-sm flex-1 ${
                                                                isCorrect
                                                                    ? "text-green-800 font-medium"
                                                                    : "text-gray-700"
                                                            }`}
                                                        >
                                                            {opt || "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Explanation */}
                            {questionExplanation && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3">Giải thích chi tiết</div>
                                    <details className="cursor-pointer">
                                        <summary className="text-sm font-medium text-gray-700 hover:text-gray-900 select-none">
                                            Xem giải thích
                                        </summary>
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                                                {questionExplanation}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <TagsSelector value={questionTagsState} onChange={setQuestionTagsState} />
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700">Đáp án đúng</div>
                                <Radio.Group value={qCorrect} onChange={(e) => setQCorrect(e.target.value)}>
                                    {["A", "B", "C", "D"].map((opt) => (
                                        <Radio key={opt} value={opt}>
                                            {opt}
                                        </Radio>
                                    ))}
                                </Radio.Group>
                            </div>

                            {/* Content */}
                            {partNumber && [3, 4, 5, 7].includes(partNumber) && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Nội dung câu hỏi</div>
                                    <Input.TextArea
                                        rows={3}
                                        value={qContent}
                                        onChange={(e) => setQContent(e.target.value)}
                                        placeholder="Nhập nội dung câu hỏi"
                                    />
                                </div>
                            )}

                            {/* Options */}
                            {partNumber !== 1 && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Đáp án (A-D)</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {["A", "B", "C", "D"].map((label, idx) => (
                                            <div key={label} className="flex items-center gap-2">
                                                <span className="w-5 font-semibold">{label}.</span>
                                                <Input
                                                    value={qOptions[idx] ?? ""}
                                                    onChange={(e) => {
                                                        const next = [...qOptions];
                                                        next[idx] = e.target.value;
                                                        setQOptions(next);
                                                    }}
                                                    placeholder={`Đáp án ${label}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Explanation */}
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700">Giải thích</div>
                                <Input.TextArea
                                    rows={4}
                                    value={qExplanation}
                                    onChange={(e) => setQExplanation(e.target.value)}
                                    placeholder="Nhập giải thích"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportDetailPage;
