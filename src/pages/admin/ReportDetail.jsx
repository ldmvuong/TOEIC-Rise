import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import { getReportById, updateQuestionReport, updateQuestionGroup, getQuestionGroup } from "@/api/api";
import api from "@/api/axios-customize";
import { Spin, Tag, Button, Descriptions, Alert, Input, Radio, Upload } from "antd";
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import parse from "html-react-parser";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import TagsSelector from "@/components/admin/TagsSelector";
import {
    validateQuestionGroupAudio,
    validateQuestionGroupImage,
    isValidQuestionGroupAudioUrl,
    isValidQuestionGroupImageUrl,
} from "@/utils/validation";

const { Dragger } = Upload;

const reasonLabels = {
    WRONG_ANSWER: "Wrong Answer",
    TYPO: "Typo",
    WRONG_EXPLANATION: "Wrong Explanation",
    INCORRECT_CONTENT: "Incorrect Content",
    MISSING_MEDIA: "Missing Media",
    OFFENSIVE_CONTENT: "Offensive Content",
    OTHER: "Other",
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
    
    // Validation errors
    const [validationError, setValidationError] = useState("");
    const [groupValidationError, setGroupValidationError] = useState("");
    const [questionValidationError, setQuestionValidationError] = useState("");

    // Resolve form
    const [status, setStatus] = useState("RESOLVED");
    const [resolvedNote, setResolvedNote] = useState("");

    // Edit flags
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [submittingGroup, setSubmittingGroup] = useState(false);
    const [isEditingQuestion, setIsEditingQuestion] = useState(false);
    const [savingQuestion, setSavingQuestion] = useState(false);
    
    // Track if group/question has been saved
    const [groupSaved, setGroupSaved] = useState(false);
    const [questionSaved, setQuestionSaved] = useState(false);

    // Prepared data for API submission
    const [preparedGroupUpdate, setPreparedGroupUpdate] = useState(null);
    const [preparedQuestionUpdate, setPreparedQuestionUpdate] = useState(null);
    const [preparedAudioFile, setPreparedAudioFile] = useState(null);
    const [preparedImageFile, setPreparedImageFile] = useState(null);
    const [preparedAudioMode, setPreparedAudioMode] = useState("keep");
    const [preparedImageMode, setPreparedImageMode] = useState("keep");
    const [preparedAudioUrl, setPreparedAudioUrl] = useState("");
    const [preparedImageUrl, setPreparedImageUrl] = useState("");

    // Question group editable fields
    const [audioMode, setAudioMode] = useState("keep"); // "keep" | "upload" | "url"
    const [imageMode, setImageMode] = useState("keep"); // "keep" | "upload" | "url"
    const [audioFile, setAudioFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);
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
                setError(err?.response?.data?.message || err?.message || "Unable to load report");
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

    const shouldShowAudio = partNumber ? [1, 2, 3, 4].includes(partNumber) : true;
    const shouldShowImage = partNumber ? [1, 4, 7].includes(partNumber) : true;
    const shouldShowPassage = partNumber ? [6, 7].includes(partNumber) : false;
    const shouldShowTranscript = partNumber === 5 ? false : true;
    
    // Keep old names for backward compatibility
    const partShowsAudio = shouldShowAudio;
    const partShowsImage = shouldShowImage;
    const partShowsPassage = shouldShowPassage;
    const partShowsTranscript = shouldShowTranscript;

    const openQuestionEdit = () => {
        if (report) {
            setQuestionSaved(false); // Reset saved flag when editing
            // Reset prepared data
            setPreparedQuestionUpdate(null);
            // Initialize form values
            setQContent(report.questionContent || "");
            const opts = Array.isArray(report.questionOptions) ? [...report.questionOptions] : [];
            while (opts.length < 4) opts.push("");
            setQOptions(opts.slice(0, 4).map((o) => o || ""));
            setQCorrect(report.questionCorrectOption || "A");
            setQExplanation(report.questionExplanation || "");
            setQuestionTagsState(
                Array.isArray(report.questionTags)
                    ? report.questionTags.map((t, idx) => ({
                          id: idx,
                          name: typeof t === "string" ? t : t?.name || ""
                      })).filter((t) => t.name)
                    : []
            );
        }
        setIsEditingQuestion(true);
    };

    const closeQuestionEdit = () => {
        setIsEditingQuestion(false);
        setSavingQuestion(false);
        // Reset to original values
        if (report) {
            setQContent(report.questionContent || "");
            const opts = Array.isArray(report.questionOptions) ? [...report.questionOptions] : [];
            while (opts.length < 4) opts.push("");
            setQOptions(opts.slice(0, 4).map((o) => o || ""));
            setQCorrect(report.questionCorrectOption || "A");
            setQExplanation(report.questionExplanation || "");
            setQuestionTagsState(
                Array.isArray(report.questionTags)
                    ? report.questionTags.map((t, idx) => ({
                          id: idx,
                          name: typeof t === "string" ? t : t?.name || ""
                      })).filter((t) => t.name)
                    : []
            );
        }
    };

    const handleSaveQuestion = () => {
        if (!id || !report) return;

        const partHasContent = partNumber && [3, 4, 5, 7].includes(partNumber);
        const isPart12 = partNumber === 1 || partNumber === 2;

        // Basic required validations
        setQuestionValidationError("");
        if (partHasContent) {
            const trimmedContent = (qContent || "").trim();
            if (!trimmedContent) {
                setQuestionValidationError("Please enter question content");
                return;
            }
        }

        const trimmedExplanation = (qExplanation || "").trim();
        if (!trimmedExplanation) {
            setQuestionValidationError("Please enter explanation");
            return;
        }

        if (!questionTagsState || questionTagsState.length === 0) {
            setQuestionValidationError("Please select at least one tag");
            return;
        }

        // Prepare question options based on part
        let opts;
        if (isPart12) {
            // Part 1, 2: backend luôn nhận 4 giá trị null cho options
            opts = [null, null, null, null];
        } else {
            opts = [...qOptions];
            while (opts.length < 4) opts.push("");
            opts = opts.map((o) => (o && o.trim() !== "" ? o : null));
        }

        // Prepare question update data (save to state, not send API yet)
        const tagsString = questionTagsState.map(tag => tag.name).join("; ");
        
        const questionUpdate = {
            id: report.questionId,
            questionGroupId: report.questionGroupId,
            content: partHasContent ? qContent.trim() : "",
            options: opts,
            correctOption: qCorrect,
            explanation: trimmedExplanation,
            tags: tagsString,
        };

        setPreparedQuestionUpdate(questionUpdate);
        setQuestionValidationError("");
        setIsEditingQuestion(false);
        setQuestionSaved(true); // Mark as saved
    };

    const beforeUploadAudio = (file) => {
        const validation = validateQuestionGroupAudio(file);
        if (!validation.valid) {
            setGroupValidationError(validation.errors[0]);
            return Upload.LIST_IGNORE;
        }
        setGroupValidationError("");
        setAudioFile(file);
        return false;
    };

    const beforeUploadImage = (file) => {
        const validation = validateQuestionGroupImage(file);
        if (!validation.valid) {
            setGroupValidationError(validation.errors[0]);
            return Upload.LIST_IGNORE;
        }
        setGroupValidationError("");
        setImageFile(file);
        return false;
    };

    const removeAudio = () => {
        setAudioFile(null);
    };

    const removeImage = () => {
        setImageFile(null);
    };

    const handleEditGroup = () => {
        if (!partNumber) {
            setGroupValidationError("Unable to determine part. Please go back to Test Detail page and try again.");
            return;
        }
        setGroupValidationError("");
        setIsEditingGroup(true);
        setGroupSaved(false); // Reset saved flag when editing
        // Reset prepared data
        setPreparedGroupUpdate(null);
        setPreparedAudioFile(null);
        setPreparedImageFile(null);
        setPreparedAudioMode("keep");
        setPreparedImageMode("keep");
        setPreparedAudioUrl("");
        setPreparedImageUrl("");
        // Initialize form values
        setGroupPassage(report?.questionGroupPassage || "");
        setGroupTranscript(report?.questionGroupTranscript || "");
        // Set mode based on whether audio/image exists
        if (shouldShowAudio) {
            setAudioMode(report?.questionGroupAudioUrl ? "keep" : "upload");
        }
        if (shouldShowImage) {
            setImageMode(report?.questionGroupImageUrl ? "keep" : "upload");
        }
        setAudioFile(null);
        setImageFile(null);
        setGroupAudioUrl("");
        setGroupImageUrl("");
    };

    const handleCancelGroupEdit = () => {
        setIsEditingGroup(false);
        // Reset to original values
        if (report) {
            setGroupAudioUrl(report.questionGroupAudioUrl || "");
            setGroupImageUrl(report.questionGroupImageUrl || "");
            setGroupPassage(report.questionGroupPassage || "");
            setGroupTranscript(report.questionGroupTranscript || "");
            // Reset mode
            if (shouldShowAudio) {
                setAudioMode(report.questionGroupAudioUrl ? "keep" : "upload");
            }
            if (shouldShowImage) {
                setImageMode(report.questionGroupImageUrl ? "keep" : "upload");
            }
        }
        setAudioFile(null);
        setImageFile(null);
    };

    const handleSaveGroup = () => {
        if (!id || !report) return;

        setGroupValidationError("");

        // Validate transcript (required)
        const transcriptText = groupTranscript?.replace(/<[^>]*>/g, "").trim();
        if (!groupTranscript || !transcriptText || transcriptText === "") {
            setGroupValidationError("Please enter transcript");
            return;
        }

        // Validate audio if required
        if (shouldShowAudio) {
            if (audioMode === "upload" && !audioFile) {
                setGroupValidationError("Please upload audio file or enter audio URL");
                return;
            }
            if (audioMode === "url" && !groupAudioUrl.trim()) {
                setGroupValidationError("Please enter audio URL");
                return;
            }
            if (audioMode === "url" && groupAudioUrl.trim()) {
                if (!isValidQuestionGroupAudioUrl(groupAudioUrl.trim())) {
                    setGroupValidationError("Invalid audio URL. URL must start with http:// or https:// and have extension .mp3, .wav, .ogg, .m4a, or .aac");
                    return;
                }
            }
        }

        // Validate image
        // Part 1: required, Part 4 and 7: optional
        if (shouldShowImage) {
            const isImageRequired = partNumber === 1;
            
            if (isImageRequired) {
                // Part 1: image is required
                if (imageMode === "upload" && !imageFile) {
                    setGroupValidationError("Please upload image file or enter image URL");
                    return;
                }
                if (imageMode === "url" && !groupImageUrl.trim()) {
                    setGroupValidationError("Please enter image URL");
                    return;
                }
            }
            
            // Validate URL format if URL is provided (for all parts)
            if (imageMode === "url" && groupImageUrl.trim()) {
                if (!isValidQuestionGroupImageUrl(groupImageUrl.trim())) {
                    setGroupValidationError("Invalid image URL. URL must start with http:// or https:// and have extension .jpg, .jpeg, .png, .gif, or .bmp");
                    return;
                }
            }
        }

        // Prepare questionGroupUpdate object (save to state, not send API yet)
        // Note: Do not include 'id' field as backend QuestionGroupUpdateRequest doesn't have it
        const questionGroupUpdate = {
            transcript: groupTranscript,
            passage: shouldShowPassage ? groupPassage : null,
        };

        // Add audio/image URLs if using URL mode or keep mode
        if (shouldShowAudio) {
            if (audioMode === "url" && groupAudioUrl.trim()) {
                questionGroupUpdate.audioUrl = groupAudioUrl.trim();
            } else if (audioMode === "keep" && report.questionGroupAudioUrl) {
                questionGroupUpdate.audioUrl = report.questionGroupAudioUrl;
            }
        }

        if (shouldShowImage) {
            if (imageMode === "url" && groupImageUrl.trim()) {
                questionGroupUpdate.imageUrl = groupImageUrl.trim();
            } else if (imageMode === "keep" && report.questionGroupImageUrl) {
                questionGroupUpdate.imageUrl = report.questionGroupImageUrl;
            }
        }

        // Save prepared data to state
        setPreparedGroupUpdate(questionGroupUpdate);
        setPreparedAudioFile(audioMode === "upload" ? audioFile : null);
        setPreparedImageFile(imageMode === "upload" ? imageFile : null);
        setPreparedAudioMode(audioMode);
        setPreparedImageMode(imageMode);
        setPreparedAudioUrl(audioMode === "url" ? groupAudioUrl.trim() : "");
        setPreparedImageUrl(imageMode === "url" ? groupImageUrl.trim() : "");

        setGroupValidationError("");
        setIsEditingGroup(false);
        setGroupSaved(true); // Mark as saved
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

    const handleSaveResolve = async () => {
        if (!id || !report) return;
        
        setValidationError("");
        if (!resolvedNote.trim()) {
            setValidationError("Please enter Note (resolvedNote)");
            return;
        }

        try {
            // If there are files to upload or group update, update question group first
            const hasFileUpload = (preparedAudioFile && preparedAudioMode === "upload") || 
                                  (preparedImageFile && preparedImageMode === "upload");
            
            let uploadedAudioUrl = null;
            let uploadedImageUrl = null;

            if (groupSaved && preparedGroupUpdate) {
                // Update question group first (for file upload or transcript/passage changes)
                const formData = new FormData();
                
                // Add transcript and passage
                formData.append("transcript", preparedGroupUpdate.transcript);
                if (preparedGroupUpdate.passage) {
                    formData.append("passage", preparedGroupUpdate.passage);
                }

                // Add files if uploading
                if (preparedAudioFile && preparedAudioMode === "upload") {
                    formData.append("audio", preparedAudioFile);
                } else if (preparedAudioMode === "url" && preparedAudioUrl) {
                    formData.append("audioUrl", preparedAudioUrl);
                } else if (preparedAudioMode === "keep" && report.questionGroupAudioUrl) {
                    formData.append("audioUrl", report.questionGroupAudioUrl);
                }

                if (preparedImageFile && preparedImageMode === "upload") {
                    formData.append("image", preparedImageFile);
                } else if (preparedImageMode === "url" && preparedImageUrl) {
                    formData.append("imageUrl", preparedImageUrl);
                } else if (preparedImageMode === "keep" && report.questionGroupImageUrl) {
                    formData.append("imageUrl", report.questionGroupImageUrl);
                }

                // Update question group via updateQuestionGroup
                await updateQuestionGroup(report.questionGroupId, formData);
                
                // Reload question group to get updated URLs (especially if files were uploaded)
                const groupRes = await getQuestionGroup(report.questionGroupId);
                const updatedGroup = groupRes?.data;
                if (updatedGroup) {
                    uploadedAudioUrl = updatedGroup.audioUrl;
                    uploadedImageUrl = updatedGroup.imageUrl;
                }
            }

            // Prepare questionGroupUpdate with URLs (from upload or URL mode or keep mode)
            let finalGroupUpdate = null;
            if (groupSaved && preparedGroupUpdate) {
                finalGroupUpdate = { ...preparedGroupUpdate };
                
                // Use uploaded URLs if files were uploaded, otherwise use URL mode or keep mode
                if (hasFileUpload) {
                    if (uploadedAudioUrl) {
                        finalGroupUpdate.audioUrl = uploadedAudioUrl;
                    }
                    if (uploadedImageUrl) {
                        finalGroupUpdate.imageUrl = uploadedImageUrl;
                    }
                } else {
                    // Add audio/image URLs if using URL mode or keep mode
                    if (preparedAudioMode === "url" && preparedAudioUrl) {
                        finalGroupUpdate.audioUrl = preparedAudioUrl;
                    } else if (preparedAudioMode === "keep" && preparedGroupUpdate.audioUrl) {
                        finalGroupUpdate.audioUrl = preparedGroupUpdate.audioUrl;
                    }

                    if (preparedImageMode === "url" && preparedImageUrl) {
                        finalGroupUpdate.imageUrl = preparedImageUrl;
                    } else if (preparedImageMode === "keep" && preparedGroupUpdate.imageUrl) {
                        finalGroupUpdate.imageUrl = preparedGroupUpdate.imageUrl;
                    }
                }
            }

            // Use JSON payload (endpoint only supports JSON, not multipart/form-data)
            const payload = {
                status,
                resolvedNote: resolvedNote.trim(),
                questionGroupUpdate: finalGroupUpdate,
                questionUpdate: questionSaved ? preparedQuestionUpdate : null,
            };

            await updateQuestionReport(id, payload);

            setValidationError("");
            const res = await getReportById(id, isAdmin);
            const data = res?.data ?? null;
            setReport(data);
            
            // Update form states with new data
            if (data) {
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
            
            // Reset saved flags and prepared data after resolving
            setGroupSaved(false);
            setQuestionSaved(false);
            setPreparedGroupUpdate(null);
            setPreparedQuestionUpdate(null);
            setPreparedAudioFile(null);
            setPreparedImageFile(null);
            setPreparedAudioMode("keep");
            setPreparedImageMode("keep");
            setPreparedAudioUrl("");
            setPreparedImageUrl("");
        } catch (err) {
            setValidationError(err?.response?.data?.message || err?.message || "Unable to update report");
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
                    Back
                </Button>
                <Alert type="error" message={error || "Report not found"} />
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
        questionPosition,
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
                    title="Back"
                >
                    <ArrowLeftOutlined className="text-lg" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900">Report Details</h1>
                    <div className="mt-1 text-sm text-gray-500">
                        ID: {questionReportId || id} • Part: {partName || "N/A"}
                    </div>
                </div>
            </div>

            {/* Reporter / Resolver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Reporter</h2>
                    </div>
                    <div className="p-6">
                        <Descriptions column={1} size="middle" bordered>
                            <Descriptions.Item label="Full Name">{reporterFullName || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Email">{reporterEmail || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Reasons">
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
                            <Descriptions.Item label="Description">
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
                        <h2 className="text-lg font-semibold text-gray-900">Resolver</h2>
                    </div>
                    <div className="p-6">
                        <Descriptions column={1} size="middle" bordered>
                            <Descriptions.Item label="Full Name">
                                {resolverFullName || <Tag>Not assigned</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">
                                {resolverEmail || <Tag>Not assigned</Tag>}
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
                    <h2 className="text-lg font-semibold text-gray-900">Resolve Report</h2>
                </div>
                <div className="p-6 space-y-4">
                    {validationError && (
                        <Alert type="error" message={validationError} closable onClose={() => setValidationError("")} />
                    )}
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Status</div>
                        <Radio.Group value={status} onChange={(e) => setStatus(e.target.value)}>
                            <Radio value="RESOLVED">RESOLVED</Radio>
                            <Radio value="REJECTED">REJECTED</Radio>
                        </Radio.Group>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Note <span className="text-red-500">*</span></div>
                        <Input.TextArea
                            rows={3}
                            value={resolvedNote}
                            onChange={(e) => setResolvedNote(e.target.value)}
                            placeholder="Enter resolution note"
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="primary" onClick={handleSaveResolve}>
                            Save Resolution
                        </Button>
                    </div>
                </div>
            </div>

            {/* Question Group info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Question Group Information</h2>
                    {/* Part 5: No edit button (no transcript, audio, image, passage to edit) */}
                    {partNumber !== 5 && (
                        <>
                            {!isEditingGroup ? (
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={handleEditGroup}
                                >
                                    Edit
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        icon={<CloseOutlined />}
                                        onClick={handleCancelGroupEdit}
                                        disabled={submittingGroup}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        onClick={handleSaveGroup}
                                        loading={submittingGroup}
                                    >
                                        Save
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="p-6 space-y-6">
                    {groupValidationError && (
                        <Alert type="error" message={groupValidationError} closable onClose={() => setGroupValidationError("")} />
                    )}
                    {!isEditingGroup ? (
                        <>
                            {/* Audio - Part 1, 2, 3, 4 */}
                            {shouldShowAudio && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Audio
                                    </div>
                                    {questionGroupAudioUrl ? (
                                        <audio controls className="w-full">
                                            <source src={questionGroupAudioUrl} type="audio/mpeg" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    ) : (
                                        <div className="text-center text-gray-400 py-4">
                                            No audio
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Image - Part 1, 4, 7 */}
                            {shouldShowImage && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        Image
                                    </div>
                                    {questionGroupImageUrl ? (
                                        <div className="w-full flex justify-center bg-gray-50 rounded-lg p-4">
                                            <img
                                                src={questionGroupImageUrl}
                                                alt="Question group"
                                                className="max-h-96 object-contain rounded-lg border border-gray-200"
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Passage - Part 6, 7 only */}
                            {shouldShowPassage && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Passage
                                    </div>
                                    {questionGroupPassage ? (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm leading-relaxed">
                                            {parse(questionGroupPassage)}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-4">
                                            No passage
                                        </div>
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
                                    {questionGroupTranscript ? (
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm leading-relaxed">
                                            {parse(questionGroupTranscript)}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-4">
                                            No transcript
                                        </div>
                                    )}
                                </div>
                            )}

                            {!questionGroupAudioUrl && !questionGroupImageUrl && !questionGroupPassage && !questionGroupTranscript && (
                                <div className="text-center text-gray-400 py-8">
                                    No media or transcript information
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Audio - Part 1, 2, 3, 4 */}
                            {shouldShowAudio && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Audio
                                    </div>
                                    <div className="space-y-3">
                                        {/* Toggle Mode */}
                                        {report?.questionGroupAudioUrl ? (
                                            <Radio.Group
                                                value={audioMode}
                                                onChange={(e) => {
                                                    setAudioMode(e.target.value);
                                                    if (e.target.value === "keep") {
                                                        setAudioFile(null);
                                                        setGroupAudioUrl("");
                                                    }
                                                }}
                                                className="w-full"
                                            >
                                                <Radio value="keep">Keep current</Radio>
                                                <Radio value="upload">Upload file</Radio>
                                                <Radio value="url">Enter URL</Radio>
                                            </Radio.Group>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="text-sm text-gray-600 mb-2">
                                                    No audio. Would you like to add audio?
                                                </div>
                                                <Radio.Group
                                                    value={audioMode}
                                                    onChange={(e) => {
                                                        setAudioMode(e.target.value);
                                                    }}
                                                    className="w-full"
                                                >
                                                    <Radio value="upload">Upload file</Radio>
                                                    <Radio value="url">Enter URL</Radio>
                                                </Radio.Group>
                                            </div>
                                        )}

                                        {/* Current audio preview (if exists and mode is keep) */}
                                        {audioMode === "keep" && report?.questionGroupAudioUrl && (
                                            <div className="mt-2">
                                                <audio controls className="w-full">
                                                    <source src={report.questionGroupAudioUrl} />
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
                                                                Your browser does not support the audio element.
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
                                                    <p className="ant-upload-text">Click or drag audio file here</p>
                                                    <p className="ant-upload-hint">Audio files only, max 10MB</p>
                                                </Dragger>
                                            </div>
                                        )}

                                        {/* URL mode */}
                                        {audioMode === "url" && (
                                            <div className="space-y-2">
                                                <Input
                                                    placeholder="Enter audio URL"
                                                    value={groupAudioUrl}
                                                    onChange={(e) => setGroupAudioUrl(e.target.value)}
                                                />
                                                {groupAudioUrl && (
                                                    <div className="mt-2">
                                                        <audio controls className="w-full">
                                                            <source src={groupAudioUrl} />
                                                        </audio>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Image - Part 1, 4, 7 */}
                            {shouldShowImage && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        Image   
                                    </div>
                                    <div className="space-y-3">
                                        {/* Toggle Mode */}
                                        {report?.questionGroupImageUrl ? (
                                            <Radio.Group
                                                value={imageMode}
                                                onChange={(e) => {
                                                    setImageMode(e.target.value);
                                                    if (e.target.value === "keep") {
                                                        setImageFile(null);
                                                        setGroupImageUrl("");
                                                    }
                                                }}
                                                className="w-full"
                                            >
                                                <Radio value="keep">Keep current</Radio>
                                                <Radio value="upload">Upload file</Radio>
                                                <Radio value="url">Enter URL</Radio>
                                            </Radio.Group>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="text-sm text-gray-600 mb-2">
                                                    No image. Would you like to add image?
                                                </div>
                                                <Radio.Group
                                                    value={imageMode}
                                                    onChange={(e) => {
                                                        setImageMode(e.target.value);
                                                    }}
                                                    className="w-full"
                                                >
                                                    <Radio value="upload">Upload file</Radio>
                                                    <Radio value="url">Enter URL</Radio>
                                                </Radio.Group>
                                            </div>
                                        )}

                                        {/* Current image preview (if exists and mode is keep) */}
                                        {imageMode === "keep" && report?.questionGroupImageUrl && (
                                            <div className="mt-2 w-full flex justify-center bg-gray-50 rounded-lg p-4">
                                                <img
                                                    src={report.questionGroupImageUrl}
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
                                                    <p className="ant-upload-text">Click or drag image file here</p>
                                                    <p className="ant-upload-hint">Image files only, max 5MB</p>
                                                </Dragger>
                                            </div>
                                        )}

                                        {/* URL mode */}
                                        {imageMode === "url" && (
                                            <div className="space-y-2">
                                                <Input
                                                    placeholder="Enter image URL"
                                                    value={groupImageUrl}
                                                    onChange={(e) => setGroupImageUrl(e.target.value)}
                                                />
                                                {groupImageUrl && (
                                                    <div className="mt-2 w-full flex justify-center bg-gray-50 rounded-lg p-4">
                                                        <img
                                                            src={groupImageUrl}
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
                                </div>
                            )}

                            {partShowsPassage && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Passage</div>
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
                                            data={groupPassage}
                                            config={editorConfiguration}
                                            onReady={(editor) => {
                                                // Editor is ready to use
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
                                    <div className="text-sm font-medium text-gray-700">
                                        Transcript <span className="text-red-500">*</span>
                                    </div>
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
                                            data={groupTranscript}
                                            config={editorConfiguration}
                                            onReady={(editor) => {
                                                // Editor is ready to use
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
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Question (1)
                    </h2>
                </div>
                <div className="p-6">
                    {questionValidationError && (
                        <Alert type="error" message={questionValidationError} closable onClose={() => setQuestionValidationError("")} className="mb-4" />
                    )}
                    {!isEditingQuestion ? (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            {/* Question Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                                    {questionPosition || questionId || 1}
                                </span>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-700">
                                        Question {questionPosition || questionId || 1}
                                    </div>
                                    {questionCorrectOption && (
                                        <div className="text-xs text-green-600 font-medium mt-1">
                                            Correct answer: {questionCorrectOption}
                                        </div>
                                    )}
                                </div>
                                {Array.isArray(questionTags) && questionTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {questionTags.map((tag, tagIdx) => (
                                            <Tag key={tagIdx} color="blue" className="text-xs">
                                                {tag}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                                <div className="ml-auto">
                                    <Button
                                        size="small"
                                        onClick={openQuestionEdit}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </div>

                            {/* Question Content */}
                            {questionContent && (
                                <div className="mb-4 text-sm text-gray-800">
                                    {parse(questionContent)}
                                </div>
                            )}

                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                {(() => {
                                    const opts = Array.isArray(questionOptions) ? questionOptions : [];
                                    const displayOptions = partNumber === 2 
                                        ? opts.slice(0, 3) // Part 2 only show A, B, C
                                        : opts.slice(0, 4); // Other parts show A, B, C, D
                                    
                                    // Ensure we always show 4 options (or 3 for part 2)
                                    const optionsToShow = partNumber === 2 ? 3 : 4;
                                    while (displayOptions.length < optionsToShow) {
                                        displayOptions.push(null);
                                    }
                                    
                                    return displayOptions.map((option, optIdx) => {
                                        const label = String.fromCharCode(65 + optIdx); // A, B, C, D...
                                        const isCorrect = questionCorrectOption === label;
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
                                    });
                                })()}
                            </div>

                            {/* Explanation */}
                            {questionExplanation && (
                                <details className="mt-4 cursor-pointer">
                                    <summary className="text-sm font-medium text-gray-700 hover:text-gray-900 select-none">
                                        Detailed explanation
                                    </summary>
                                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                                            {questionExplanation}
                                        </div>
                                    </div>
                                </details>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
                            {/* Modal-like Header */}
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {report?.questionPosition || report?.questionId
                                        ? `Edit Question ${report.questionPosition || report.questionId}`
                                        : "Edit Question"}
                                </h3>
                            </div>
                            
                            {/* Modal-like Body */}
                            <div className="p-6 space-y-4">
                                {/* Tags - moved to top */}
                                <TagsSelector
                                    value={questionTagsState}
                                    onChange={setQuestionTagsState}
                                />

                                {/* Content - chỉ dùng cho part 3,4,5,7 */}
                                {partNumber && [3, 4, 5, 7].includes(partNumber) && (
                                    <div>
                                        <div className="mb-1 text-sm font-medium text-gray-700">
                                            Nội dung câu hỏi <span className="text-red-500">*</span>
                                        </div>
                                        <Input.TextArea
                                            rows={2}
                                            value={qContent}
                                            onChange={(e) => setQContent(e.target.value)}
                                            placeholder="Enter question content"
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
                                                        value={qOptions[idx] ?? ""}
                                                        onChange={(e) => {
                                                            const next = [...qOptions];
                                                            next[idx] = e.target.value;
                                                            setQOptions(next);
                                                        }}
                                                        placeholder={`Option ${label}`}
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
                                        value={qCorrect}
                                        onChange={(e) => setQCorrect(e.target.value)}
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
                                        rows={8}
                                        value={qExplanation}
                                        onChange={(e) => setQExplanation(e.target.value)}
                                        placeholder="Enter explanation"
                                    />
                                </div>
                            </div>

                            {/* Modal-like Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                                <Button onClick={closeQuestionEdit} disabled={savingQuestion}>
                                    Hủy
                                </Button>
                                <Button 
                                    type="primary" 
                                    onClick={handleSaveQuestion}
                                    loading={savingQuestion}
                                >
                                    Lưu
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportDetailPage;
