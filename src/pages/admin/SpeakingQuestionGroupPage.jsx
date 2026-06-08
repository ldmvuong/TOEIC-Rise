import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, message, Button, Form, Upload, Radio, Input, Modal } from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import parse from "html-react-parser";
import {
  getSpeakingQuestionGroup,
  updateSpeakingQuestionGroup,
  getSpeakingQuestionById,
  updateSpeakingQuestion,
} from "@/api/api";
import {
  validateQuestionGroupImage,
  isValidQuestionGroupImageUrl,
} from "@/utils/validation";
import PassageCKEditor from "@/components/admin/PassageCKEditor";

const { Dragger } = Upload;

const SpeakingQuestionGroupPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [questionGroup, setQuestionGroup] = useState(null);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [imageMode, setImageMode] = useState("keep");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [passage, setPassage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionContent, setQuestionContent] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  const loadGroup = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await getSpeakingQuestionGroup(id);
      const data = res?.data ?? null;
      setQuestionGroup(data);
      setPassage(data?.passage || "");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Unable to load question group",
      );
      message.error("Unable to load speaking question group");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
    setPassage(questionGroup?.passage || "");
    setImageMode(questionGroup?.imageUrl ? "keep" : "upload");
    setImageFile(null);
    setImageUrl("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPassage(questionGroup?.passage || "");
    setImageMode(questionGroup?.imageUrl ? "keep" : "upload");
    setImageFile(null);
    setImageUrl("");
  };

  const handleSave = async () => {
    if (!questionGroup?.id) return;
    const passageText = passage?.replace(/<[^>]*>/g, "").trim();
    if (!passage || !passageText) {
      message.error("Passage is required");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("passage", passage);

      if (imageMode === "upload" && imageFile) {
        formData.append("image", imageFile);
      } else if (imageMode === "url" && imageUrl) {
        if (!isValidQuestionGroupImageUrl(imageUrl)) {
          message.error("Invalid image URL");
          setSubmitting(false);
          return;
        }
        formData.append("imageUrl", imageUrl);
      } else if (imageMode === "keep" && questionGroup.imageUrl) {
        formData.append("imageUrl", questionGroup.imageUrl);
      }

      await updateSpeakingQuestionGroup(questionGroup.id, formData);
      message.success("Question group updated");
      await loadGroup();
      setImageFile(null);
      setImageUrl("");
      setImageMode("keep");
      setIsEditing(false);
    } catch (err) {
      message.error(
        err?.response?.data?.message || err?.message || "Update failed",
      );
    } finally {
      setSubmitting(false);
    }
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

  const openQuestionModal = async (question) => {
    setEditingQuestion(question);
    setQuestionModalOpen(true);
    setLoadingQuestion(true);
    setQuestionContent("");
    try {
      const res = await getSpeakingQuestionById(question.id);
      const q = res?.data;
      setQuestionContent(q?.content ?? "");
    } catch (e) {
      message.error("Unable to load question");
      setQuestionContent(question.content || "");
    } finally {
      setLoadingQuestion(false);
    }
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    setEditingQuestion(null);
    setQuestionContent("");
    setSavingQuestion(false);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion || !questionGroup?.id) return;
    try {
      setSavingQuestion(true);
      await updateSpeakingQuestion({
        id: editingQuestion.id,
        questionGroupId: questionGroup.id,
        content: questionContent ?? "",
      });
      message.success("Question updated");
      const res = await getSpeakingQuestionGroup(id);
      setQuestionGroup(res?.data ?? null);
      closeQuestionModal();
    } catch (err) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update question",
      );
    } finally {
      setSavingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[40vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !questionGroup) {
    return (
      <div className="p-4">
        <div className="text-red-600 mb-3">{error || "Not found"}</div>
        <button
          type="button"
          className="px-4 py-2 bg-gray-200 rounded"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100"
            title="Back"
          >
            <ArrowLeftOutlined className="text-lg" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Speaking question group</h1>
            <div className="text-sm text-gray-500">
              ID: {questionGroup.id} · Position: {questionGroup.position ?? "—"}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Group content</h2>
            {!isEditing ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={submitting}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Image
              </div>
              {isEditing ? (
                <div className="space-y-3">
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
                    >
                      <Radio value="keep">Keep current</Radio>
                      <Radio value="upload">Upload</Radio>
                      <Radio value="url">Image URL</Radio>
                    </Radio.Group>
                  ) : (
                    <Radio.Group
                      value={imageMode}
                      onChange={(e) => setImageMode(e.target.value)}
                    >
                      <Radio value="upload">Upload</Radio>
                      <Radio value="url">Image URL</Radio>
                    </Radio.Group>
                  )}

                  {imageMode === "keep" && questionGroup.imageUrl && (
                    <div className="mt-2 flex justify-center bg-gray-50 p-4 rounded">
                      <img
                        src={questionGroup.imageUrl}
                        alt=""
                        className="max-h-64 object-contain rounded"
                      />
                    </div>
                  )}

                  {imageMode === "upload" && (
                    <div>
                      {imageFile && (
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={URL.createObjectURL(imageFile)}
                            alt=""
                            className="max-h-20 rounded"
                          />
                          <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => setImageFile(null)}
                          />
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
                        <p className="ant-upload-text">Drop image or click</p>
                      </Dragger>
                    </div>
                  )}

                  {imageMode === "url" && (
                    <div className="space-y-2">
                      <Input
                        placeholder="https://...jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                      {imageUrl.trim() && (
                        <div className="flex justify-center bg-gray-50 p-4 rounded">
                          <img
                            src={imageUrl}
                            alt="Preview"
                            className="max-h-64 object-contain rounded"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                questionGroup.imageUrl && (
                  <div className="flex justify-center bg-gray-50 p-4 rounded">
                    <img
                      src={questionGroup.imageUrl}
                      alt=""
                      className="max-h-96 object-contain rounded"
                    />
                  </div>
                )
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Passage <span className="text-red-500">*</span>
              </div>
              {isEditing ? (
                <PassageCKEditor data={passage} onChange={setPassage} />
              ) : (
                <div className="bg-gray-50 p-4 rounded border text-sm">
                  {questionGroup.passage ? parse(questionGroup.passage) : "—"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">
              Questions ({questionGroup.questions?.length || 0})
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {questionGroup.questions?.map((q, idx) => (
              <div
                key={q.id}
                className="border rounded-lg p-4 bg-gray-50 flex gap-3"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold shrink-0">
                  {q.position ?? idx + 1}
                </span>
                <div className="flex-1 text-sm">
                  {q.content ? (
                    parse(q.content)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <Button size="small" onClick={() => openQuestionModal(q)}>
                  Edit
                </Button>
              </div>
            ))}
            {(!questionGroup.questions ||
              questionGroup.questions.length === 0) && (
              <div className="text-center text-gray-500 py-6">No questions</div>
            )}
          </div>
        </div>
      </div>

      <Modal
        title={
          editingQuestion
            ? `Edit question ${editingQuestion.position ?? ""}`
            : "Edit question"
        }
        open={questionModalOpen}
        onCancel={closeQuestionModal}
        onOk={handleSaveQuestion}
        confirmLoading={savingQuestion}
        okText="Save"
        cancelText="Cancel"
        destroyOnHidden
        width={640}
      >
        {loadingQuestion ? (
          <div className="py-8 text-center">
            <Spin />
          </div>
        ) : (
          <Form layout="vertical">
            <Form.Item label="Content">
              <Input.TextArea
                rows={8}
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default SpeakingQuestionGroupPage;
