import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  Modal,
  Empty,
  Popconfirm,
} from "antd";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Heading,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  List,
  Table,
  TableToolbar,
  BlockQuote,
  Font,
  Alignment,
  Indent,
  IndentBlock,
  RemoveFormat,
  Image,
  ImageUpload,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import LessonVideoUrlField from "@/components/admin/lessons/LessonVideoUrlField";
import StaffTagPaginatedSelect from "@/components/admin/lessons/StaffTagPaginatedSelect";
import {
  createLearningPathLesson,
  getAdminLearningPathDetail,
  updateAdminLesson,
  uploadCloudinaryImage,
  deleteCloudinaryImage,
} from "@/api/api";

const { Title, Text } = Typography;

const TOPIC_OPTIONS = [
  "VOCABULARY",
  "GRAMMAR",
  "PRONUNCIATION",
  "SPEAKING",
  "READING",
  "WRITING",
  "LISTENING",
].map((v) => ({ value: v, label: v }));

const LEVEL_OPTIONS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((v) => ({
  value: v,
  label: v,
}));

function nextLessonOrderIndex(detail) {
  const lessons = Array.isArray(detail?.lessons) ? detail.lessons : [];
  return lessons.length + 1;
}

class ImageUploadAdapter {
  constructor(loader, onUploaded) {
    this.loader = loader;
    this.onUploaded = onUploaded;
  }

  upload() {
    return this.loader.file.then((file) => {
      const formData = new FormData();
      // Backend expects Multipart @ModelAttribute BlogPostImageRequest.image
      formData.append("image", file);
      return uploadCloudinaryImage(formData).then((res) => {
        const url = res?.data;
        if (!url) {
          throw new Error("Image upload succeeded but no URL returned");
        }
        this.onUploaded?.(url);
        return { default: url };
      });
    });
  }

  abort() {
    // Optional: axios request cancellation can be added later if needed.
  }
}

function createImageUploadAdapterPlugin(onUploaded) {
  return function ImageUploadAdapterPlugin(editor) {
    const fileRepository = editor.plugins.get("FileRepository");
    fileRepository.createUploadAdapter = (loader) =>
      new ImageUploadAdapter(loader, onUploaded);
  };
}

export default function AdminLearningPathLessonEditorPage() {
  const { id, lessonId } = useParams();
  const navigate = useNavigate();
  const learningPathId = useMemo(() => id, [id]);
  const isEdit = Boolean(lessonId);

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pathName, setPathName] = useState("");
  const [learningPathSlug, setLearningPathSlug] = useState("");
  const [contentInitial, setContentInitial] = useState("");
  const contentRef = useRef("");
  const contentSyncTimerRef = useRef(null);
  const [deletingImageUrl, setDeletingImageUrl] = useState(null);
  const [manageImagesOpen, setManageImagesOpen] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);

  const loadForEdit = useCallback(async () => {
    if (!learningPathId) return;
    if (!isEdit) {
      setLoading(true);
      try {
        const res = await getAdminLearningPathDetail(learningPathId);
        const detail = res?.data ?? {};
        setPathName(detail?.name || `Learning Path #${learningPathId}`);
        setLearningPathSlug(detail?.slug || "");
        const nextOrder = nextLessonOrderIndex(detail);
        form.setFieldsValue({
          title: "",
          slug: "",
          practice: "",
          videoUrl: "",
          topic: "VOCABULARY",
          level: "BEGINNER",
          content: "",
          isActive: true,
          orderIndex: nextOrder,
        });
        setContentInitial("");
        contentRef.current = "";
      } catch (e) {
        message.error(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load learning path",
        );
        setPathName(`Learning Path #${learningPathId}`);
        form.setFieldsValue({
          title: "",
          slug: "",
          practice: "",
          videoUrl: "",
          topic: "VOCABULARY",
          level: "BEGINNER",
          content: "",
          isActive: true,
          orderIndex: 1,
        });
        setContentInitial("");
        contentRef.current = "";
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await getAdminLearningPathDetail(learningPathId);
      const detail = res?.data ?? {};
      setPathName(detail?.name || `Learning Path #${learningPathId}`);
      setLearningPathSlug(detail?.slug || "");
      const lesson = Array.isArray(detail?.lessons)
        ? detail.lessons.find((l) => String(l.id) === String(lessonId))
        : null;
      if (!lesson) {
        message.error("Lesson not found");
        navigate(`/admin/learning-paths/${detail?.slug || learningPathId}`);
        return;
      }
      form.setFieldsValue({
        title: lesson?.title ?? "",
        slug: lesson?.slug ?? "",
        practice: lesson?.practice ?? "",
        videoUrl: lesson?.videoUrl ?? "",
        topic: lesson?.topic ?? "",
        level: lesson?.level ?? "",
        content: lesson?.content ?? "",
        isActive: Boolean(lesson?.isActive),
        orderIndex: lesson?.orderIndex ?? 1,
      });
      setContentInitial(lesson?.content ?? "");
      contentRef.current = lesson?.content ?? "";
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Failed to load lesson",
      );
    } finally {
      setLoading(false);
    }
  }, [form, isEdit, learningPathId, lessonId, navigate]);

  useEffect(() => {
    loadForEdit();
  }, [loadForEdit]);

  const onSubmit = useCallback(async () => {
    if (!learningPathId) return;

    // Ensure form has latest editor HTML before validation/submission.
    form.setFieldValue("content", contentRef.current || "");
    try {
      await form.validateFields();
    } catch {
      return;
    }

    try {
      setLoading(true);
      const values = form.getFieldsValue();
      const videoUrl = (values.videoUrl || "").trim();

      if (isEdit) {
        await updateAdminLesson(lessonId, {
          title: values.title,
          slug: (values.slug || "").trim(),
          practice: values.practice ?? "",
          ...(videoUrl ? { videoUrl } : {}),
          topic: values.topic,
          level: values.level,
          content: values.content,
          isActive: values.isActive,
          orderIndex: Number(values.orderIndex),
        });
        message.success("Updated lesson");
      } else {
        const detailRes = await getAdminLearningPathDetail(learningPathId);
        const detail = detailRes?.data ?? {};
        const orderIndex = nextLessonOrderIndex(detail);
        await createLearningPathLesson(Number(learningPathId), {
          title: values.title,
          slug: (values.slug || "").trim(),
          practice: values.practice ?? "",
          ...(videoUrl ? { videoUrl } : {}),
          topic: values.topic,
          level: values.level,
          content: values.content ?? "",
          isActive: values.isActive,
          orderIndex,
        });
        message.success("Created lesson");
      }

      navigate(`/admin/learning-paths/${learningPathSlug || learningPathId}`);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }, [form, isEdit, learningPathId, learningPathSlug, lessonId, navigate]);

  const extractImageUrlsFromHtml = useCallback((html) => {
    if (!html || typeof window === "undefined") return [];
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return [...doc.querySelectorAll("img")]
        .map((img) => img.getAttribute("src"))
        .filter(Boolean);
    } catch {
      return [];
    }
  }, []);

  const handleImageUploaded = useCallback((url) => {
    if (!url) return;
    setUploadedImageUrls((prev) =>
      prev.includes(url) ? prev : [...prev, url],
    );
  }, []);

  const handleDeleteUploadedImage = async (imageUrl) => {
    if (!imageUrl) return;

    const usedUrls = extractImageUrlsFromHtml(contentInitial);
    const isInUse = usedUrls.some(
      (u) => normalizeImageUrl(u) === normalizeImageUrl(imageUrl),
    );

    if (isInUse) {
      message.error(
        "Cannot delete: this image is still used in CKEditor content.",
      );
      return;
    }

    try {
      setDeletingImageUrl(imageUrl);
      await deleteCloudinaryImage(imageUrl);
      setUploadedImageUrls((prev) =>
        prev.filter(
          (u) => normalizeImageUrl(u) !== normalizeImageUrl(imageUrl),
        ),
      );
      message.success("Image deleted");
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Failed to delete image",
      );
    } finally {
      setDeletingImageUrl(null);
    }
  };

  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    // Backend may return absolute URLs; editor usage check should ignore query params.
    return url.split("#")[0].split("?")[0].trim();
  };

  const blogPostEditorConfiguration = useMemo(
    () => ({
      licenseKey: "GPL",
      plugins: [
        Essentials,
        Heading,
        Paragraph,
        Bold,
        Italic,
        Underline,
        List,
        Table,
        TableToolbar,
        BlockQuote,
        Image,
        ImageUpload,
        Font,
        Alignment,
        Indent,
        IndentBlock,
        RemoveFormat,
      ],
      heading: {
        options: [
          {
            model: "paragraph",
            title: "Paragraph",
            class: "ck-heading_paragraph",
          },
          {
            model: "heading1",
            view: "h1",
            title: "Heading 1",
            class: "ck-heading_heading1",
          },
          {
            model: "heading2",
            view: "h2",
            title: "Heading 2",
            class: "ck-heading_heading2",
          },
          {
            model: "heading3",
            view: "h3",
            title: "Heading 3",
            class: "ck-heading_heading3",
          },
        ],
      },
      toolbar: [
        "undo",
        "redo",
        "|",
        "heading",
        "|",
        "bold",
        "italic",
        "underline",
        "|",
        "fontSize",
        "fontFamily",
        "fontColor",
        "fontBackgroundColor",
        "|",
        "numberedList",
        "bulletedList",
        "|",
        "imageUpload",
        "insertTable",
        "blockQuote",
        "|",
        "alignment",
        "|",
        "indent",
        "outdent",
        "|",
        "removeFormat",
      ],
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
      extraPlugins: [
        createImageUploadAdapterPlugin(handleImageUploaded),
      ],
    }),
    [handleImageUploaded],
  );

  return (
    <div style={{ padding: 16 }}>
      <div className="mb-4">
        <Link
          to={`/admin/learning-paths/${learningPathSlug || learningPathId}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to detail
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <Title level={4} style={{ margin: 0 }}>
            {isEdit ? `Edit lesson #${lessonId}` : "Add lesson"}
          </Title>
          <Tag style={{ marginInlineEnd: 0 }}>{pathName}</Tag>
        </div>
      </div>
      <Modal
        open={manageImagesOpen}
        onCancel={() => setManageImagesOpen(false)}
        title="Manage uploaded images"
        footer={null}
        width={920}
        destroyOnClose
      >
        {uploadedImageUrls.length === 0 ? (
          <Empty description="No uploaded images in this editor session." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedImageUrls.map((url) => (
              <div
                key={url}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white"
              >
                <div className="bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-36 object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-xs text-slate-500 line-clamp-2">
                    {url}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Popconfirm
                      title="Delete this image?"
                      okText="Yes"
                      cancelText="No"
                      onConfirm={() => handleDeleteUploadedImage(url)}
                      disabled={deletingImageUrl === url}
                    >
                      <Button
                        size="small"
                        danger
                        disabled={deletingImageUrl === url}
                      >
                        {deletingImageUrl === url ? "Deleting..." : "Delete"}
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Card variant="outlined" style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="Lesson title" />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Slug"
              name="slug"
              rules={[
                { required: true, message: "Slug is required" },
                {
                  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
                  message: "Slug only allows letters, digits, and '-'",
                },
              ]}
            >
              <Input placeholder="lesson-7" />
            </Form.Item>
            <Form.Item label="Practice" name="practice">
              <StaffTagPaginatedSelect placeholder="Select practice tag" />
            </Form.Item>
          </div>

          <Form.Item name="videoUrl">
            <LessonVideoUrlField
              value={form.getFieldValue("videoUrl")}
              onChange={(url) => form.setFieldValue("videoUrl", url)}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Topic"
              name="topic"
              rules={[{ required: true, message: "Topic is required" }]}
            >
              <Select
                placeholder="Select topic"
                options={TOPIC_OPTIONS}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              label="Level"
              name="level"
              rules={[{ required: true, message: "Level is required" }]}
            >
              <Select placeholder="Select level" options={LEVEL_OPTIONS} />
            </Form.Item>
          </div>

          <div className="flex items-center justify-end mb-2">
            <Button
              size="small"
              onClick={() => setManageImagesOpen(true)}
              disabled={uploadedImageUrls.length === 0}
            >
              Manage images ({uploadedImageUrls.length})
            </Button>
          </div>
          <Form.Item label="Content">
            <div className="rounded-lg border border-gray-200">
              <CKEditor
                key={`${learningPathId || "lp"}-${lessonId || "new"}-${isEdit ? "edit" : "create"}`}
                editor={ClassicEditor}
                data={contentInitial}
                config={blogPostEditorConfiguration}
                onReady={(editor) => {
                  // Keep a local ref so we can sync to antd Form without re-rendering editor on every keystroke.
                  contentRef.current = editor.getData() || "";
                }}
                onChange={(_event, editor) => {
                  const data = editor.getData();
                  contentRef.current = data;

                  // Debounce syncing to antd Form to avoid selection/caret jumps when clicking toolbar buttons.
                  if (contentSyncTimerRef.current) {
                    clearTimeout(contentSyncTimerRef.current);
                  }
                  contentSyncTimerRef.current = setTimeout(() => {
                    form.setFieldValue("content", contentRef.current || "");
                  }, 250);
                }}
                onBlur={() => {
                  if (contentSyncTimerRef.current)
                    clearTimeout(contentSyncTimerRef.current);
                  form.setFieldValue("content", contentRef.current || "");
                }}
              />
            </div>
            <Form.Item name="content" noStyle>
              <Input type="hidden" />
            </Form.Item>
          </Form.Item>

          <Form.Item name="isActive" valuePropName="checked" hidden>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item name="orderIndex" hidden>
            <Input type="hidden" />
          </Form.Item>

          <Space>
            <Button type="primary" onClick={onSubmit} loading={loading}>
              {isEdit ? "Save" : "Create"}
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `/admin/learning-paths/${learningPathSlug || learningPathId}`,
                )
              }
              disabled={loading}
            >
              Cancel
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
