import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Spin, message, Tag, Button, Form, Upload, Radio, Input, Modal } from "antd";
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import { getQuestionGroup, updateQuestionGroup, updateQuestion } from "@/api/api";
import parse from "html-react-parser";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {
    validateQuestionGroupAudio,
    validateQuestionGroupImage,
    isValidQuestionGroupAudioUrl,
    isValidQuestionGroupImageUrl,
} from "@/utils/validation";

const { Dragger } = Upload;

const QuestionGroupPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [questionGroup, setQuestionGroup] = useState(null);
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [partNumber, setPartNumber] = useState(null);
    
    // Form states
    const [audioMode, setAudioMode] = useState("keep"); // "keep" | "upload" | "url"
    const [imageMode, setImageMode] = useState("keep"); // "keep" | "upload" | "url"
    const [audioFile, setAudioFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [transcript, setTranscript] = useState("");
    const [passage, setPassage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // Question edit states
    const [questionModalOpen, setQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [savingQuestion, setSavingQuestion] = useState(false);
    const [questionContent, setQuestionContent] = useState("");
    const [questionOptions, setQuestionOptions] = useState(["", "", "", ""]);
    const [questionCorrectOption, setQuestionCorrectOption] = useState("A");
    const [questionExplanation, setQuestionExplanation] = useState("");
    const [questionTags, setQuestionTags] = useState("");

    useEffect(() => {
        // Get partNumber from location state
        if (location.state?.partNumber) {
            setPartNumber(location.state.partNumber);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchQuestionGroup = async () => {
            if (!id) return;
            setLoading(true);
            setError("");
            try {
                const res = await getQuestionGroup(id);
                setQuestionGroup(res?.data ?? null);
                // Initialize form values
                setTranscript(res?.data?.transcript || "");
                setPassage(res?.data?.passage || "");
            } catch (e) {
                setError(e?.response?.data?.message || e?.message || "Không thể tải dữ liệu");
                message.error("Không thể tải chi tiết nhóm câu hỏi");
            } finally {
                setLoading(false);
            }
        };
        fetchQuestionGroup();
    }, [id]);

    if (loading) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
                <Spin size="large" />
                <div className="mt-4 text-gray-600">Đang tải chi tiết nhóm câu hỏi...</div>
            </div>
        );
    }

    if (error || !questionGroup) {
        return (
            <div className="p-4">
                <div className="text-red-600 mb-3">{error || "Không tìm thấy nhóm câu hỏi"}</div>
                <button
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                    onClick={() => navigate(-1)}
                >
                    Quay lại
                </button>
            </div>
        );
    }

    // Determine which fields to show based on part number
    // Part 1, 2, 3, 4: Audio + Transcript
    // Part 5: No transcript, audio, image, or passage - only questions (but still show section)
    // Part 6, 7: Passage + Transcript
    // Part 1, 4, 7: Image (if applicable)
    const shouldShowAudio = partNumber && [1, 2, 3, 4].includes(partNumber);
    const shouldShowImage = partNumber && [1, 4, 7].includes(partNumber);
    const shouldShowPassage = partNumber && [6, 7].includes(partNumber);
    const shouldShowTranscript = partNumber !== 5; // Part 5 has no transcript

    const handleEdit = () => {
        if (!partNumber) {
            message.warning("Không xác định được part. Vui lòng quay lại trang Test Detail và thử lại.");
            return;
        }
        setIsEditing(true);
        // Initialize form values
        setTranscript(questionGroup?.transcript || "");
        setPassage(questionGroup?.passage || "");
        // Set mode based on whether audio/image exists (only for parts that support them)
        if (shouldShowAudio) {
            setAudioMode(questionGroup?.audioUrl ? "keep" : "upload");
        }
        if (shouldShowImage) {
            setImageMode(questionGroup?.imageUrl ? "keep" : "upload");
        }
        setAudioFile(null);
        setImageFile(null);
        setAudioUrl("");
        setImageUrl("");
    };

    const handleCancel = () => {
        setIsEditing(false);
        setTranscript(questionGroup?.transcript || "");
        setPassage(questionGroup?.passage || "");
        // Reset mode based on whether audio/image exists (only for parts that support them)
        if (shouldShowAudio) {
            setAudioMode(questionGroup?.audioUrl ? "keep" : "upload");
        }
        if (shouldShowImage) {
            setImageMode(questionGroup?.imageUrl ? "keep" : "upload");
        }
        setAudioFile(null);
        setImageFile(null);
        setAudioUrl("");
        setImageUrl("");
    };

    const handleSave = async () => {
        if (!questionGroup?.id) return;

        // Validate transcript (required)
        // CKEditor returns HTML, check if it's empty
        const transcriptText = transcript?.replace(/<[^>]*>/g, "").trim();
        if (!transcript || !transcriptText || transcriptText === "") {
            message.error("Vui lòng nhập transcript");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();

            // Transcript is always required
            if (transcript) {
                formData.append("transcript", transcript);
            }

            // Passage only for part 6 and 7
            if (shouldShowPassage && passage) {
                formData.append("passage", passage);
            }

            // Audio - based on mode
            if (shouldShowAudio) {
                if (audioMode === "upload" && audioFile) {
                    formData.append("audio", audioFile);
                } else if (audioMode === "url" && audioUrl) {
                    if (!isValidQuestionGroupAudioUrl(audioUrl)) {
                        message.error("URL audio không hợp lệ. URL phải bắt đầu bằng http:// hoặc https:// và có đuôi .mp3, .wav, .ogg, .m4a, hoặc .aac");
                        setSubmitting(false);
                        return;
                    }
                    formData.append("audioUrl", audioUrl);
                } else if (audioMode === "keep" && questionGroup.audioUrl) {
                    // Send existing audioUrl when keeping current value
                    formData.append("audioUrl", questionGroup.audioUrl);
                }
            }

            // Image - based on mode
            if (shouldShowImage) {
                if (imageMode === "upload" && imageFile) {
                    formData.append("image", imageFile);
                } else if (imageMode === "url" && imageUrl) {
                    if (!isValidQuestionGroupImageUrl(imageUrl)) {
                        message.error("URL hình ảnh không hợp lệ. URL phải bắt đầu bằng http:// hoặc https:// và có đuôi .jpg, .jpeg, .png, .gif, hoặc .bmp");
                        setSubmitting(false);
                        return;
                    }
                    formData.append("imageUrl", imageUrl);
                } else if (imageMode === "keep" && questionGroup.imageUrl) {
                    // Send existing imageUrl when keeping current value
                    formData.append("imageUrl", questionGroup.imageUrl);
                }
            }

            await updateQuestionGroup(questionGroup.id, formData);
            message.success("Cập nhật nhóm câu hỏi thành công");
            
            // Reload data
            const res = await getQuestionGroup(id);
            setQuestionGroup(res?.data ?? null);
            setTranscript(res?.data?.transcript || "");
            setPassage(res?.data?.passage || "");
            setAudioFile(null);
            setImageFile(null);
            setAudioUrl("");
            setImageUrl("");
            setAudioMode("keep");
            setImageMode("keep");
            setIsEditing(false);
        } catch (error) {
            message.error(error?.response?.data?.message || error?.message || "Không thể cập nhật nhóm câu hỏi");
        } finally {
            setSubmitting(false);
        }
    };

    const beforeUploadAudio = (file) => {
        const validation = validateQuestionGroupAudio(file);
        if (!validation.valid) {
            message.error(validation.errors[0]);
            return Upload.LIST_IGNORE;
        }
        setAudioFile(file);
        return false;
    };

    const beforeUploadImage = (file) => {
        const validation = validateQuestionGroupImage(file);
        if (!validation.valid) {
            message.error(validation.errors[0]);
            return Upload.LIST_IGNORE;
        }
        setImageFile(file);
        return false;
    };

    const removeAudio = () => {
        setAudioFile(null);
    };

    const removeImage = () => {
        setImageFile(null);
    };

    // ===== Question edit helpers =====
    const openQuestionModal = (question) => {
        setEditingQuestion(question);
        // content
        setQuestionContent(question.content || "");
        // options
        const opts = Array.isArray(question.options) ? [...question.options] : [];
        while (opts.length < 4) opts.push("");
        setQuestionOptions(opts.slice(0, 4).map((o) => o || ""));
        // correct option
        setQuestionCorrectOption(question.correctOption || "A");
        // explanation
        setQuestionExplanation(question.explanation || "");
        // tags: backend expects String, current field có thể là array
        setQuestionTags(
            Array.isArray(question.tags) ? question.tags.join("; ") : (question.tags || "")
        );
        setQuestionModalOpen(true);
    };

    const closeQuestionModal = () => {
        setQuestionModalOpen(false);
        setEditingQuestion(null);
        setSavingQuestion(false);
        setQuestionContent("");
        setQuestionOptions(["", "", "", ""]);
        setQuestionCorrectOption("A");
        setQuestionExplanation("");
        setQuestionTags("");
    };

    const handleQuestionOptionChange = (index, value) => {
        setQuestionOptions((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleSaveQuestion = async () => {
        if (!editingQuestion || !questionGroup?.id) return;

        const partHasContent = [3, 4, 5, 7].includes(partNumber);
        const isPart12 = partNumber === 1 || partNumber === 2;

        // Basic required validations
        if (partHasContent) {
            const trimmedContent = (questionContent || "").trim();
            if (!trimmedContent) {
                message.error("Vui lòng nhập nội dung câu hỏi");
                return;
            }
        }

        const trimmedExplanation = (questionExplanation || "").trim();
        if (!trimmedExplanation) {
            message.error("Vui lòng nhập giải thích đáp án");
            return;
        }

        const trimmedTags = (questionTags || "").trim();
        if (!trimmedTags) {
            message.error("Vui lòng nhập tags");
            return;
        }

        let opts;
        if (isPart12) {
            // Part 1, 2: backend luôn nhận 4 giá trị null cho options
            opts = [null, null, null, null];
        } else {
            opts = [...questionOptions];
            while (opts.length < 4) opts.push("");
            opts = opts.map((o) => (o && o.trim() !== "" ? o : null));
        }

        try {
            setSavingQuestion(true);
            await updateQuestion({
                id: editingQuestion.id,
                questionGroupId: questionGroup.id,
                content: partHasContent ? questionContent : "",
                options: opts,
                correctOption: questionCorrectOption,
                explanation: trimmedExplanation,
                tags: trimmedTags,
            });
            message.success("Cập nhật câu hỏi thành công");

            // reload question group
            const res = await getQuestionGroup(id);
            setQuestionGroup(res?.data ?? null);
            closeQuestionModal();
        } catch (error) {
            message.error(
                error?.response?.data?.message || error?.message || "Không thể cập nhật câu hỏi"
            );
            setSavingQuestion(false);
        }
    };

    const editorConfiguration = {
        // CKEditor 5 v44+ requires explicit licenseKey.
        // If you use the free GPL build, keep 'GPL'. If you have a commercial key,
        // replace this value with the key from your CKEditor account.
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
    };

    return (
        <>
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
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Chi tiết nhóm câu hỏi
                    </h1>
                    <div className="mt-1 text-sm text-gray-500">
                        ID: {questionGroup.id} • Vị trí: {questionGroup.position}
                    </div>
                </div>
            </div>

            {/* Part 1: Question Group Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Header with Edit Button */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Thông tin nhóm câu hỏi</h2>
                    {/* Part 5: No edit button (no transcript, audio, image, passage to edit) */}
                    {partNumber !== 5 && (
                        <>
                            {!isEditing ? (
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={handleEdit}
                                >
                                    Chỉnh sửa
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        icon={<CloseOutlined />}
                                        onClick={handleCancel}
                                        disabled={submitting}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        onClick={handleSave}
                                        loading={submitting}
                                    >
                                        Lưu
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Media Section */}
                <div className="p-6 space-y-6">
                    {/* Audio - Part 1, 2, 3, 4 */}
                    {shouldShowAudio && (
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Audio
                            </div>
                            {isEditing ? (
                                <div className="space-y-3">
                                    {/* Toggle Mode */}
                                    {questionGroup.audioUrl ? (
                                        <Radio.Group
                                            value={audioMode}
                                            onChange={(e) => {
                                                setAudioMode(e.target.value);
                                                if (e.target.value === "keep") {
                                                    setAudioFile(null);
                                                    setAudioUrl("");
                                                }
                                            }}
                                            className="w-full"
                                        >
                                            <Radio value="keep">Giữ nguyên</Radio>
                                            <Radio value="upload">Upload file</Radio>
                                            <Radio value="url">Nhập URL</Radio>
                                        </Radio.Group>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-600 mb-2">
                                                Chưa có audio. Bạn muốn thêm audio?
                                            </div>
                                            <Radio.Group
                                                value={audioMode}
                                                onChange={(e) => {
                                                    setAudioMode(e.target.value);
                                                }}
                                                className="w-full"
                                            >
                                                <Radio value="upload">Upload file</Radio>
                                                <Radio value="url">Nhập URL</Radio>
                                            </Radio.Group>
                                        </div>
                                    )}

                                    {/* Current audio preview (if exists and mode is keep) */}
                                    {audioMode === "keep" && questionGroup.audioUrl && (
                                        <div className="mt-2">
                                            <audio controls className="w-full">
                                                <source src={questionGroup.audioUrl} />
                                            </audio>
                                        </div>
                                    )}

                                    {/* Upload mode */}
                                    {audioMode === "upload" && (
                                        <div className="space-y-2">
                                            {audioFile && (
                                                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-700 flex-1 font-medium">{audioFile.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={removeAudio}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <DeleteOutlined />
                                                        </button>
                                                    </div>
                                                    <div className="mt-2">
                                                        <audio controls className="w-full">
                                                            <source src={URL.createObjectURL(audioFile)} />
                                                            Trình duyệt của bạn không hỗ trợ phát audio.
                                                        </audio>
                                                    </div>
                                                </div>
                                            )}
                                            <Dragger
                                                beforeUpload={beforeUploadAudio}
                                                showUploadList={false}
                                                accept="audio/*"
                                            >
                                                <p className="ant-upload-drag-icon">
                                                    <InboxOutlined />
                                                </p>
                                                <p className="ant-upload-text">Click hoặc kéo thả file audio vào đây</p>
                                                <p className="ant-upload-hint">Chỉ chấp nhận file audio, tối đa 10MB</p>
                                            </Dragger>
                                        </div>
                                    )}

                                    {/* URL mode */}
                                    {audioMode === "url" && (
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Nhập URL audio"
                                                value={audioUrl}
                                                onChange={(e) => setAudioUrl(e.target.value)}
                                            />
                                            {audioUrl && (
                                                <div className="mt-2">
                                                    <audio controls className="w-full">
                                                        <source src={audioUrl} />
                                                    </audio>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                questionGroup.audioUrl && (
                                    <audio controls className="w-full">
                                        <source src={questionGroup.audioUrl} type="audio/mpeg" />
                                        Trình duyệt của bạn không hỗ trợ phát audio.
                                    </audio>
                                )
                            )}
                        </div>
                    )}

                    {/* Image - Part 1, 4, 7 */}
                    {shouldShowImage && (
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                Hình ảnh
                            </div>
                            {isEditing ? (
                                <div className="space-y-3">
                                    {/* Toggle Mode */}
                                    {questionGroup.imageUrl ? (
                                        <Radio.Group
                                            value={imageMode}
                                            onChange={(e) => {
                                                setImageMode(e.target.value);
                                                if (e.target.value === "keep") {
                                                    setImageFile(null);
                                                    setImageUrl("");
                                                }
                                            }}
                                            className="w-full"
                                        >
                                            <Radio value="keep">Giữ nguyên</Radio>
                                            <Radio value="upload">Upload file</Radio>
                                            <Radio value="url">Nhập URL</Radio>
                                        </Radio.Group>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-600 mb-2">
                                                Chưa có hình ảnh. Bạn muốn thêm hình ảnh?
                                            </div>
                                            <Radio.Group
                                                value={imageMode}
                                                onChange={(e) => {
                                                    setImageMode(e.target.value);
                                                }}
                                                className="w-full"
                                            >
                                                <Radio value="upload">Upload file</Radio>
                                                <Radio value="url">Nhập URL</Radio>
                                            </Radio.Group>
                                        </div>
                                    )}

                                    {/* Current image preview (if exists and mode is keep) */}
                                    {imageMode === "keep" && questionGroup.imageUrl && (
                                        <div className="mt-2 w-full flex justify-center bg-gray-50 rounded-lg p-4">
                                            <img
                                                src={questionGroup.imageUrl}
                                                alt="Current"
                                                className="max-h-48 object-contain rounded-lg border border-gray-200"
                                            />
                                        </div>
                                    )}

                                    {/* Upload mode */}
                                    {imageMode === "upload" && (
                                        <div className="space-y-2">
                                            {imageFile && (
                                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                                    <img
                                                        src={URL.createObjectURL(imageFile)}
                                                        alt="Preview"
                                                        className="max-h-20 object-contain rounded"
                                                    />
                                                    <span className="text-sm text-gray-700 flex-1">{imageFile.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <DeleteOutlined />
                                                    </button>
                                                </div>
                                            )}
                                            <Dragger
                                                beforeUpload={beforeUploadImage}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <p className="ant-upload-drag-icon">
                                                    <InboxOutlined />
                                                </p>
                                                <p className="ant-upload-text">Click hoặc kéo thả file hình ảnh vào đây</p>
                                                <p className="ant-upload-hint">Chỉ chấp nhận file hình ảnh, tối đa 5MB</p>
                                            </Dragger>
                                        </div>
                                    )}

                                    {/* URL mode */}
                                    {imageMode === "url" && (
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Nhập URL hình ảnh"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                            />
                                            {imageUrl && (
                                                <div className="mt-2 w-full flex justify-center bg-gray-50 rounded-lg p-4">
                                                    <img
                                                        src={imageUrl}
                                                        alt="Preview"
                                                        className="max-h-48 object-contain rounded-lg border border-gray-200"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                questionGroup.imageUrl && (
                                    <div className="w-full flex justify-center bg-gray-50 rounded-lg p-4">
                                        <img
                                            src={questionGroup.imageUrl}
                                            alt="Question group"
                                            className="max-h-96 object-contain rounded-lg border border-gray-200"
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* Passage - Part 6, 7 only */}
                    {shouldShowPassage && (
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Đoạn văn
                            </div>
                            {isEditing ? (
                                <div className="ckeditor-wrapper" style={{ minHeight: "500px" }}>
                                    <style>{`
                                        .ckeditor-wrapper .ck-editor__editable {
                                            min-height: 400px !important;
                                        }
                                        .ckeditor-wrapper .ck-editor {
                                            min-height: 500px;
                                        }
                                    `}</style>
                                    <CKEditor
                                        editor={ClassicEditor}
                                        data={passage}
                                        config={editorConfiguration}
                                        onReady={(editor) => {
                                            // Editor is ready to use
                                        }}
                                        onChange={(event, editor) => {
                                            const data = editor.getData();
                                            setPassage(data);
                                        }}
                                    />
                                </div>
                            ) : (
                                questionGroup.passage && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm leading-relaxed">
                                        {parse(questionGroup.passage)}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* Transcript - Always required */}
                    {shouldShowTranscript && (
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Transcript <span className="text-red-500">*</span>
                            </div>
                            {isEditing ? (
                                <div className="ckeditor-wrapper" style={{ minHeight: "500px" }}>
                                    <style>{`
                                        .ckeditor-wrapper .ck-editor__editable {
                                            min-height: 400px !important;
                                        }
                                        .ckeditor-wrapper .ck-editor {
                                            min-height: 500px;
                                        }
                                    `}</style>
                                    <CKEditor
                                        editor={ClassicEditor}
                                        data={transcript}
                                        config={editorConfiguration}
                                        onReady={(editor) => {
                                            // Editor is ready to use
                                        }}
                                        onChange={(event, editor) => {
                                            const data = editor.getData();
                                            setTranscript(data);
                                        }}
                                    />
                                </div>
                            ) : (
                                questionGroup.transcript && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm leading-relaxed">
                                        {parse(questionGroup.transcript)}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {!isEditing && !questionGroup.audioUrl && !questionGroup.imageUrl && !questionGroup.passage && !questionGroup.transcript && (
                        <div className="text-center text-gray-400 py-8">
                            Không có thông tin media hoặc transcript
                        </div>
                    )}
                </div>
            </div>

            {/* Part 2: Questions Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Câu hỏi ({questionGroup.questions?.length || 0})
                    </h2>
                </div>

                <div className="p-6">

                    <div className="space-y-6">
                        {questionGroup.questions?.map((question, idx) => (
                            <div
                                key={question.id}
                                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                            >
                                {/* Question Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                                        {question.position || idx + 1}
                                    </span>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-700">
                                            Câu hỏi {question.position || idx + 1}
                                        </div>
                                        {question.correctOption && (
                                            <div className="text-xs text-green-600 font-medium mt-1">
                                                Đáp án đúng: {question.correctOption}
                                            </div>
                                        )}
                                    </div>
                                    {question.tags && question.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {question.tags.map((tag, tagIdx) => (
                                                <Tag key={tagIdx} color="blue" className="text-xs">
                                                    {tag}
                                                </Tag>
                                            ))}
                                        </div>
                                    )}
                                    <div className="ml-auto">
                                        <Button
                                            size="small"
                                            onClick={() => openQuestionModal(question)}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    </div>
                                </div>

                                {/* Question Content */}
                                {question.content && (
                                    <div className="mb-4 text-sm text-gray-800">
                                        {parse(question.content)}
                                    </div>
                                )}

                                {/* Options */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                    {(partNumber === 2
                                        ? question.options?.slice(0, 3) // Part 2 only show A, B, C
                                        : question.options
                                    )?.map((option, optIdx) => {
                                        const label = String.fromCharCode(65 + optIdx); // A, B, C, D...
                                        const isCorrect = question.correctOption === label;
                                        return (
                                            <div
                                                key={optIdx}
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
                                                        {option || "-"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                {question.explanation && (
                                    <details className="mt-4 cursor-pointer">
                                        <summary className="text-sm font-medium text-gray-700 hover:text-gray-900 select-none">
                                            Giải thích chi tiết
                                        </summary>
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                                                {question.explanation}
                                            </div>
                                        </div>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>

                    {(!questionGroup.questions || questionGroup.questions.length === 0) && (
                        <div className="text-center text-gray-500 py-8">
                            Không có câu hỏi nào trong nhóm này
                        </div>
                    )}
                </div>
            </div>

        </div>
            {/* Question Edit Modal */}
            <Modal
                title={
                    editingQuestion
                        ? `Chỉnh sửa câu hỏi ${editingQuestion.position || ""}`
                        : "Chỉnh sửa câu hỏi"
                }
                open={questionModalOpen}
                onCancel={closeQuestionModal}
                onOk={handleSaveQuestion}
                confirmLoading={savingQuestion}
                okText="Lưu"
                cancelText="Hủy"
                destroyOnClose
                width={700}
            >
                {editingQuestion && (
                    <div className="space-y-4">
                        {/* Content - chỉ dùng cho part 3,4,5,7 */}
                        {[3, 4, 5, 7].includes(partNumber) && (
                            <div>
                                <div className="mb-1 text-sm font-medium text-gray-700">
                                    Nội dung câu hỏi
                                </div>
                                <Input.TextArea
                                    rows={3}
                                    value={questionContent}
                                    onChange={(e) => setQuestionContent(e.target.value)}
                                    placeholder="Nhập nội dung câu hỏi"
                                />
                            </div>
                        )}

                        {/* Options */}
                        {(partNumber !== 1 && partNumber !== 2) && (
                            <div>
                                <div className="mb-1 text-sm font-medium text-gray-700">
                                    Đáp án (A, B, C, D)
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {["A", "B", "C", "D"].map((label, idx) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <span className="font-semibold w-5">{label}.</span>
                                            <Input
                                                value={questionOptions[idx] ?? ""}
                                                onChange={(e) =>
                                                    handleQuestionOptionChange(idx, e.target.value)
                                                }
                                                placeholder={`Đáp án ${label}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Correct option */}
                        <div>
                            <div className="mb-1 text-sm font-medium text-gray-700">
                                Đáp án đúng <span className="text-red-500">*</span>
                            </div>
                            <Radio.Group
                                value={questionCorrectOption}
                                onChange={(e) => setQuestionCorrectOption(e.target.value)}
                            >
                                {(partNumber === 2 ? ["A", "B", "C"] : ["A", "B", "C", "D"]).map(
                                    (opt) => (
                                        <Radio key={opt} value={opt}>
                                            {opt}
                                        </Radio>
                                    )
                                )}
                            </Radio.Group>
                        </div>

                        {/* Explanation */}
                        <div>
                            <div className="mb-1 text-sm font-medium text-gray-700">
                                Giải thích <span className="text-red-500">*</span>
                            </div>
                            <Input.TextArea
                                rows={6}
                                value={questionExplanation}
                                onChange={(e) => setQuestionExplanation(e.target.value)}
                                placeholder="Nhập giải thích đáp án"
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <div className="mb-1 text-sm font-medium text-gray-700">
                                Tags <span className="text-red-500">*</span>
                            </div>
                            <Input
                                value={questionTags}
                                onChange={(e) => setQuestionTags(e.target.value)}
                                placeholder="Ví dụ: [Part 5] Câu hỏi ngữ pháp; [Grammar] Thi"
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default QuestionGroupPage;

