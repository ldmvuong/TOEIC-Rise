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

function normalizeLessonHtml(html) {
  const raw = String(html ?? "");
  // Some contents are stored with escaped quotes like: src=\"https://...png\"
  // Browsers treat that backslash as part of the attribute value, breaking images.
  return raw.replace(/\\"/g, '"');
}

function extractHeadingOutline(html) {
  if (!html || typeof window === "undefined") return [];
  try {
    const doc = new DOMParser().parseFromString(
      normalizeLessonHtml(html),
      "text/html",
    );
    const headings = doc.querySelectorAll("h1, h2, h3");
    const out = [];
    headings.forEach((el, index) => {
      const tag = String(el.tagName || "").toUpperCase();
      const level = tag === "H1" ? 1 : tag === "H2" ? 2 : 3;
      out.push({
        level,
        text: el.textContent?.trim() || "(empty heading)",
        domIndex: index,
        key: `${level}-${index}`,
      });
    });
    return out;
  } catch {
    return [];
  }
}

function scrollToHeadingInCkEditor(editorWrapperEl, domIndex) {
  if (!editorWrapperEl) return false;
  const idx = Number(domIndex);
  if (!Number.isFinite(idx) || idx < 0) return false;

  const viewContainer = editorWrapperEl.querySelector(".view-content-prose");
  if (!viewContainer) return false;

  const headings = viewContainer.querySelectorAll("h1, h2, h3");
  const el = headings?.[idx];
  if (!el) return false;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  } catch {
    return false;
  }
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
  const [manageUploadsOpen, setManageUploadsOpen] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [contentHtml, setContentHtml] = useState("");
  const editorWrapperRef = useRef(null);
  const [editorMountKey, setEditorMountKey] = useState(0);
  const editorInstanceRef = useRef(null);

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

      const detailRes = await getAdminLearningPathDetail(learningPathId);
      const detail = detailRes?.data ?? {};
      const finalSlug = detail?.slug || learningPathId;

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
        navigate(`/admin/lessons/${lessonId}`);
      } else {
        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("slug", (values.slug || "").trim());
        formData.append("practice", values.practice ?? "");
        formData.append("content", values.content ?? "");
        if (videoUrl) {
          formData.append("videoUrl", videoUrl);
        }
        formData.append("topic", values.topic);
        formData.append("level", values.level);
        formData.append("isActive", values.isActive);
        await createLearningPathLesson(finalSlug, formData);
        message.success("Created lesson");
        navigate(`/admin/learning-paths/${finalSlug}`);
      }
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }, [form, isEdit, learningPathId, lessonId, navigate]);

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

    try {
      setDeletingImageUrl(imageUrl);

      const editor = editorInstanceRef.current;
      if (editor) {
        const currentData = editor.getData();
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentData, "text/html");

        const images = doc.querySelectorAll("img");
        let isEditorUpdated = false;

        images.forEach((img) => {
          if (
            normalizeImageUrl(img.getAttribute("src")) ===
            normalizeImageUrl(imageUrl)
          ) {
            const figureParent = img.closest("figure");
            if (figureParent) {
              figureParent.remove();
            } else {
              img.remove();
            }
            isEditorUpdated = true;
          }
        });

        if (isEditorUpdated) {
          const updatedHtml = doc.body.innerHTML;
          editor.setData(updatedHtml);
          contentRef.current = updatedHtml;
          setContentHtml(updatedHtml);
          form.setFieldValue("content", updatedHtml);
        }
      }

      await deleteCloudinaryImage(imageUrl);

      setUploadedImageUrls((prev) =>
        prev.filter(
          (u) => normalizeImageUrl(u) !== normalizeImageUrl(imageUrl),
        ),
      );

      message.success("Image deleted from content and storage successfully.");
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
      extraPlugins: [createImageUploadAdapterPlugin(handleImageUploaded)],
    }),
    [handleImageUploaded],
  );

  const outline = useMemo(
    () => extractHeadingOutline(contentHtml),
    [contentHtml],
  );
  const imageUrls = useMemo(
    () => extractImageUrlsFromHtml(contentRef.current),
    [contentRef, extractImageUrlsFromHtml],
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

      <Card variant="outlined" style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="Lesson title" showCount maxLength={255} />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Slug"
              name="slug"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Slug is required",
                },
                {
                  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message:
                    "Slug can only contain lowercase letters, digits, and hyphens (cannot start/end with a hyphen).",
                },
                {
                  max: 255,
                  message: "Slug must be between 1 and 255 characters long.",
                },
              ]}
            >
              <Input placeholder="lesson-7" showCount maxLength={255} />
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

          <div className="flex items-center justify-end gap-2 mb-2">
            <Button
              size="small"
              onClick={() => setManageUploadsOpen(true)}
              disabled={uploadedImageUrls.length === 0}
            >
              Session uploaded ({uploadedImageUrls.length})
            </Button>
          </div>
          <Form.Item label="Content">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div
                ref={editorWrapperRef}
                className="lg:col-span-9 ckeditor-wrapper lesson-view-content rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200"
              >
                <style>{`
  .lesson-view-content .ck-editor__editable {
    min-height: 520px !important;
    padding: 24px 28px;
    font-size: 16px;
    line-height: 1.8;
    color: #0f172a;
  }

  .lesson-view-content .ck-content {
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      sans-serif;
  }

  .lesson-view-content .ck-content h1,
  .lesson-view-content .ck-content h2,
  .lesson-view-content .ck-content h3 {
    margin: 1.4em 0 0.7em;
    font-weight: 800;
    line-height: 1.25;
    color: #0f172a;
  }

  .lesson-view-content .ck-content h1 {
    font-size: 34px;
  }

  .lesson-view-content .ck-content h2 {
    font-size: 28px;
  }

  .lesson-view-content .ck-content h3 {
    font-size: 22px;
  }

  .lesson-view-content .ck-content p {
    margin: 0.85rem 0;
    color: #334155;
  }

  .lesson-view-content .ck-content ul,
  .lesson-view-content .ck-content ol {
    padding-left: 1.7rem;
    margin: 0.8rem 0 1rem;
  }

  .lesson-view-content .ck-content li {
    margin: 0.35rem 0;
  }

  .lesson-view-content .ck-content img {
    max-width: 100%;
    height: auto;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    margin: 24px auto;
    display: block;
    box-shadow:
      0 1px 2px rgba(0,0,0,0.04),
      0 8px 24px rgba(15,23,42,0.06);
  }

  .lesson-view-content .ck-content blockquote {
    margin: 1.25rem 0;
    padding: 1rem 1.25rem;
    border-left: 4px solid #6366f1;
    background: #eef2ff;
    border-radius: 12px;
    color: #334155;
    font-style: italic;
  }

  .lesson-view-content .ck-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.2rem 0;
    overflow: hidden;
    border-radius: 12px;
  }

  .lesson-view-content .ck-content table th {
    background: #f8fafc;
    font-weight: 700;
    color: #0f172a;
  }

  .lesson-view-content .ck-content table td,
  .lesson-view-content .ck-content table th {
    border: 1px solid #e2e8f0;
    padding: 12px 14px;
    vertical-align: top;
  }

  .lesson-view-content .ck-content pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 18px;
    border-radius: 16px;
    overflow-x: auto;
    margin: 1.2rem 0;
  }

  .lesson-view-content .ck-content code {
    background: #f1f5f9;
    color: #0f172a;
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 13px;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace;
  }

  .lesson-view-content .ck-content pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }

  .lesson-view-content .ck-toolbar {
    border: none !important;
    border-bottom: 1px solid #e2e8f0 !important;
    background: #ffffff !important;
    padding: 8px !important;
  }

  .lesson-view-content .ck-editor__main {
    background: #ffffff;
  }
`}</style>
                <CKEditor
                  key={`${"new"}-${lessonId || "new"}-ck-${editorMountKey}`}
                  editor={ClassicEditor}
                  data={contentInitial}
                  config={blogPostEditorConfiguration}
                  onReady={(editorEd) => {
                    editorInstanceRef.current = editorEd;
                    contentRef.current = editorEd.getData() || "";
                    setContentHtml(editorEd.getData() || "");
                  }}
                  onChange={(_event, editorEd) => {
                    const next = editorEd.getData() || "";
                    contentRef.current = next;
                    setContentHtml(next);

                    if (contentSyncTimerRef.current) {
                      clearTimeout(contentSyncTimerRef.current);
                    }
                    contentSyncTimerRef.current = setTimeout(() => {
                      form.setFieldValue("content", contentRef.current || "");
                    }, 250);
                  }}
                  onBlur={() => {
                    if (contentSyncTimerRef.current) {
                      clearTimeout(contentSyncTimerRef.current);
                    }
                    form.setFieldValue("content", contentRef.current || "");
                  }}
                />
              </div>
              <div className="lg:col-span-3 lg:sticky lg:top-4">
                <Card
                  className="rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-4 overflow-hidden"
                  title={
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        On this page
                      </span>
                      <span className="text-xs text-slate-500">
                        {outline.length > 0
                          ? `${outline.length} sections`
                          : "—"}
                      </span>
                    </div>
                  }
                  styles={{
                    header: {
                      background:
                        "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                      borderBottom: "1px solid #e2e8f0",
                    },
                    body: {
                      maxHeight: "min(70vh, 520px)",
                      overflowY: "auto",
                      padding: "12px",
                    },
                  }}
                >
                  {outline.length === 0 ? (
                    <Text type="secondary" className="block text-sm">
                      Add <strong>Heading 1</strong>, <strong>Heading 2</strong>
                      , or <strong>Heading 3</strong> to show the outline.
                    </Text>
                  ) : (
                    <nav aria-label="Table of contents">
                      <ul className="list-none m-0 p-0 space-y-1.5">
                        {outline.map((item) => (
                          <li
                            key={item.key}
                            style={{ marginLeft: (item.level - 1) * 10 }}
                            className="text-sm"
                          >
                            <button
                              type="button"
                              className={`group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 border transition-all text-left hover:shadow-sm ${
                                item.level === 1
                                  ? "border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70"
                                  : item.level === 2
                                    ? "border-slate-200 bg-white hover:bg-slate-50"
                                    : "border-transparent bg-transparent hover:bg-slate-50"
                              }`}
                              onClick={() => {
                                scrollToHeadingInCkEditor(
                                  editorWrapperRef.current,
                                  item.domIndex,
                                );
                              }}
                            >
                              <span
                                className={`mt-[6px] h-1.5 w-1.5 rounded-full shrink-0 ${
                                  item.level === 1
                                    ? "bg-indigo-500"
                                    : item.level === 2
                                      ? "bg-slate-400"
                                      : "bg-slate-300"
                                }`}
                              />
                              <span
                                className={`break-words leading-snug ${
                                  item.level === 1
                                    ? "text-indigo-900 font-semibold group-hover:text-indigo-700"
                                    : item.level === 2
                                      ? "text-slate-700 font-medium group-hover:text-slate-900"
                                      : "text-slate-600 group-hover:text-slate-800"
                                }`}
                              >
                                {item.text}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  )}
                </Card>
              </div>
              <Form.Item name="content" noStyle>
                <Input type="hidden" />
              </Form.Item>
            </div>
          </Form.Item>

          <Modal
            title="Manage Images in Content"
            open={manageImagesOpen}
            onCancel={() => setManageImagesOpen(false)}
            footer={null}
            width={920}
            destroyOnHidden
          >
            {imageUrls.length === 0 ? (
              <Empty description="No images in this lesson content" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                  >
                    <div className="bg-slate-50">
                      <img
                        src={url}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-36 object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-slate-500 line-clamp-2">
                        {url}
                      </div>
                      <div className="mt-3 text-right">
                        <Text type="secondary" className="text-xs">
                          Image is being used in editor
                        </Text>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          <Modal
            title="Manage Uploaded Images"
            open={manageUploadsOpen}
            onCancel={() => setManageUploadsOpen(false)}
            footer={null}
            width={920}
            destroyOnHidden
          >
            {uploadedImageUrls.length === 0 ? (
              <Empty description="No images uploaded yet" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedImageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                  >
                    <div className="bg-slate-50">
                      <img
                        src={url}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-36 object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-slate-500 line-clamp-2">
                        {url}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Popconfirm
                          title="Are you sure to delete this image?"
                          onConfirm={() => handleDeleteUploadedImage(url)}
                          okText="Yes"
                          cancelText="Cancel"
                          disabled={deletingImageUrl === url}
                        >
                          <Button
                            size="small"
                            danger
                            disabled={deletingImageUrl === url}
                          >
                            {deletingImageUrl === url
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>

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
