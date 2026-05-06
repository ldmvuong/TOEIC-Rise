import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  EditOutlined,
  FileTextOutlined,
  IdcardOutlined,
  InboxOutlined,
  LineChartOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Space,
  Upload,
  Switch,
  Typography,
  message,
} from "antd";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import LessonVideoUrlField from "@/components/admin/lessons/LessonVideoUrlField";
import StaffTagPaginatedSelect from "@/components/admin/lessons/StaffTagPaginatedSelect";
import { getAdminLessonDetail, updateAdminLesson } from "@/api/api";
import { deleteCloudinaryImage } from "@/api/api";
import { createCloudinaryImageUploadAdapterPlugin } from "@/utils/ckeditorCloudinaryUploadAdapter";
import {
  BLOG_POST_THUMBNAIL_MAX_SIZE,
  isValidBlogPostThumbnailSize,
  isValidImageExtension,
} from "@/utils/validation";

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

  const editable =
    editorWrapperEl.querySelector(".ck-editor__editable") ||
    editorWrapperEl.querySelector(".ck-content");
  if (!editable) return false;

  const headings = editable.querySelectorAll("h1, h2, h3");
  const el = headings?.[idx];
  if (!el) return false;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  } catch {
    return false;
  }
}

function extractImageUrlsFromHtml(html) {
  if (!html || typeof window === "undefined") return [];
  try {
    const doc = new DOMParser().parseFromString(
      normalizeLessonHtml(html),
      "text/html",
    );
    const urls = [...doc.querySelectorAll("img")]
      .map((img) => img.getAttribute("src"))
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter(Boolean);
    return [...new Set(urls)];
  } catch {
    return [];
  }
}

/** @param {string} url */
function getYoutubeVideoId(url) {
  const raw = (url || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";
    if (host === "youtu.be") {
      id = u.pathname.replace("/", "");
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
      if (u.pathname.startsWith("/embed/"))
        id = u.pathname.split("/embed/")[1] || "";
      if (u.pathname.startsWith("/shorts/"))
        id = u.pathname.split("/shorts/")[1] || "";
    }
    id = (id || "").split("?")[0].split("&")[0].trim();
    return id || null;
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url) {
  const v = (url || "").trim().toLowerCase();
  if (!v) return false;
  return v.includes(".mp4") || v.includes(".webm");
}

function getYoutubeEmbedUrl(url) {
  const id = getYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function MetaTile({ icon, label, children }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-indigo-100 hover:bg-slate-50">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-lg text-indigo-600 shadow-sm ring-1 ring-slate-100"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="mt-1 break-words text-sm font-semibold leading-snug text-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
}

function SectionShell({ eyebrow, title, icon, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-100/80 ${className}`}
    >
      <header className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
        {icon ? (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div>
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

export default function AdminLearningPathLessonViewPage() {
  const { id: learningPathId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const referrer = location.state?.referrer;
  const autoEdit = Boolean(location.state?.autoEdit);

  const backHref = useMemo(
    () => referrer || `/admin/learning-paths/${learningPathId ?? ""}`,
    [referrer, learningPathId],
  );

  const [form] = Form.useForm();
  const contentRef = useRef("");
  const contentSyncTimerRef = useRef(null);
  const ckSessionRef = useRef(0);
  const editorInstanceRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [contentInitial, setContentInitial] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const editorWrapperRef = useRef(null);
  const [editorMountKey, setEditorMountKey] = useState(0);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailFileList, setThumbnailFileList] = useState([]);
  const [manageImagesOpen, setManageImagesOpen] = useState(false);
  const [removingImageSrc, setRemovingImageSrc] = useState(null);

  const load = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const res = await getAdminLessonDetail(lessonId);
      setLesson(res?.data ?? null);
    } catch (e) {
      setLesson(null);
      message.error(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load lesson detail",
      );
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  // If navigated from list "Edit" icon, auto-enter edit mode after detail is loaded.
  useEffect(() => {
    if (!autoEdit) return;
    if (loading) return;
    if (!lesson) return;
    if (isEditing) return;
    beginEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit, loading, lesson, isEditing]);

  useEffect(
    () => () => {
      if (contentSyncTimerRef.current) {
        clearTimeout(contentSyncTimerRef.current);
      }
    },
    [],
  );

  const beginEdit = useCallback(() => {
    if (!lesson) return;
    ckSessionRef.current += 1;
    form.setFieldsValue({
      title: lesson.title ?? "",
      slug: lesson.slug ?? "",
      practice: lesson.practice ?? "",
      videoUrl: lesson.videoUrl ?? "",
      topic: lesson.topic ?? undefined,
      level: lesson.level ?? undefined,
      orderIndex:
        lesson.orderIndex == null ? undefined : Number(lesson.orderIndex),
      isActive: Boolean(lesson.isActive),
    });
    const c = lesson.content ?? "";
    contentRef.current = c;
    setContentInitial(c);
    setContentHtml(c);
    setEditorMountKey((k) => k + 1);
    setThumbnailFile(null);
    setThumbnailFileList([]);
    setIsEditing(true);
  }, [form, lesson]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    form.resetFields();
    setContentInitial("");
    setContentHtml("");
    setEditorMountKey((k) => k + 1);
    setThumbnailFile(null);
    setThumbnailFileList([]);
    if (contentSyncTimerRef.current) {
      clearTimeout(contentSyncTimerRef.current);
    }
  }, [form]);

  // Safety: if we enter edit mode but the editor mounts empty, force a remount with lesson content.
  useEffect(() => {
    if (!isEditing) return;
    const c = lesson?.content ?? "";
    if (c && !contentInitial) {
      contentRef.current = c;
      setContentInitial(c);
      setContentHtml(c);
      setEditorMountKey((k) => k + 1);
    }
  }, [isEditing, lesson?.content, contentInitial]);

  const submitEdit = useCallback(async () => {
    if (!lessonId || !lesson) return;
    const latestContent = contentRef.current || "";
    form.setFieldValue("content", latestContent);
    try {
      await form.validateFields();
    } catch {
      return;
    }

    try {
      setSaving(true);
      const values = form.getFieldsValue();
      const videoUrl = String(values.videoUrl ?? "").trim();
      await updateAdminLesson(
        lessonId,
        {
          title: (values.title || "").trim(),
          slug: (values.slug ?? "").trim(),
          practice: values.practice ?? "",
          ...(videoUrl ? { videoUrl } : {}),
          topic: values.topic,
          level: values.level,
          content: latestContent || values.content || "",
          isActive: values.isActive,
          orderIndex: Number(values.orderIndex),
        },
        thumbnailFile ? { thumbnail: thumbnailFile } : undefined,
      );
      message.success("Đã lưu bài học");
      cancelEdit();
      await load();
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Không lưu được",
      );
    } finally {
      setSaving(false);
    }
  }, [cancelEdit, form, lesson, lessonId, load, thumbnailFile]);

  const videoUrlLive = Form.useWatch("videoUrl", form);
  const videoUrlDisplay = useMemo(() => {
    if (!isEditing) return (lesson?.videoUrl || "").trim();
    if (typeof videoUrlLive === "string") return videoUrlLive.trim();
    return (lesson?.videoUrl || "").trim();
  }, [isEditing, lesson?.videoUrl, videoUrlLive]);

  const ytEmbed = useMemo(
    () => (videoUrlDisplay ? getYoutubeEmbedUrl(videoUrlDisplay) : null),
    [videoUrlDisplay],
  );

  const outline = useMemo(
    () => extractHeadingOutline(contentHtml),
    [contentHtml],
  );
  const imageUrls = useMemo(
    () => extractImageUrlsFromHtml(contentHtml),
    [contentHtml],
  );

  const handleRemoveImageFromContent = useCallback(
    async (src) => {
      if (!src) return;
      try {
        setRemovingImageSrc(src);
        await deleteCloudinaryImage(src);
        const raw = normalizeLessonHtml(contentRef.current || contentHtml || "");
        const doc = new DOMParser().parseFromString(raw, "text/html");
        const imgs = [...doc.querySelectorAll("img")];
        imgs.forEach((img) => {
          const currentSrc = String(img.getAttribute("src") || "").trim();
          if (currentSrc === src || normalizeLessonHtml(currentSrc) === src) {
            img.remove();
          }
        });
        const next = doc.body?.innerHTML || "";
        contentRef.current = next;
        setContentHtml(next);
        setContentInitial(next);
        form.setFieldValue("content", next);
        editorInstanceRef.current?.setData?.(next);
        message.success("Đã gỡ ảnh khỏi nội dung");
      } catch (e) {
        message.error(
          e?.response?.data?.message || e?.message || "Không xoá được ảnh",
        );
      } finally {
        setRemovingImageSrc(null);
      }
    },
    [contentHtml, form],
  );

  const beforeThumbnailUpload = useCallback((file) => {
    if (!isValidImageExtension(file?.name)) {
      message.error("Use an image file (jpg, png, gif, bmp, webp)");
      return Upload.LIST_IGNORE;
    }
    if (!isValidBlogPostThumbnailSize(file?.size)) {
      message.error(
        `Image must be ${BLOG_POST_THUMBNAIL_MAX_SIZE / (1024 * 1024)}MB or smaller`,
      );
      return Upload.LIST_IGNORE;
    }

    setThumbnailFile(file);
    const url = URL.createObjectURL(file);
    setThumbnailFileList([
      {
        uid: file.uid,
        name: file.name,
        status: "done",
        originFileObj: file,
        url,
      },
    ]);
    return false;
  }, []);

  const handleRemoveThumbnail = useCallback((file) => {
    const url = file?.url;
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    setThumbnailFile(null);
    setThumbnailFileList([]);
  }, []);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/90 px-4 py-6 font-sans sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-24 shadow-sm">
            <Spin size="large" />
            <Text type="secondary" className="mt-4">
              Đang tải chi tiết bài học…
            </Text>
          </div>
        ) : !lesson ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <Text type="secondary">Không tải được bài học này.</Text>
          </div>
        ) : (
          <Form form={form} layout="vertical" className="space-y-6">
            {/* Header */}
            <header className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-100/80">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {isEditing ? (
                      <>
                        <Text className="text-sm text-slate-600">
                          Hiển thị:
                        </Text>
                        <Form.Item
                          name="isActive"
                          valuePropName="checked"
                          className="!mb-0"
                        >
                          <Switch
                            checkedChildren="Đang hoạt động"
                            unCheckedChildren="Ngưng"
                          />
                        </Form.Item>
                      </>
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          margin: 0,
                          padding: "4px 12px",
                          borderRadius: 9999,
                          border: "1px solid #bbf7d0",
                          background: "#f0fdf4",
                          color: "#15803d",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {lesson.isActive !== undefined
                          ? lesson.isActive
                            ? "Đang hoạt động"
                            : "Ngưng hoạt động"
                          : "—"}
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <Form.Item
                      name="title"
                      label={
                        <span className="font-semibold text-slate-800">
                          Tiêu đề
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tiêu đề",
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input placeholder="Tiêu đề bài học" size="large" />
                    </Form.Item>
                  ) : (
                    <Title
                      level={3}
                      className="!mb-0 !mt-1 !font-semibold !leading-tight !text-slate-900"
                      style={{ margin: 0 }}
                    >
                      {lesson.title || "Chi tiết bài học"}
                    </Title>
                  )}
                  <Text type="secondary" className="text-sm">
                    Lộ trình #{String(lesson.learningPathId ?? "—")} · Bài học
                  </Text>
                </div>
                <Space wrap className="shrink-0">
                  <Button
                    size="large"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(backHref)}
                    disabled={saving}
                  >
                    Quay lại
                  </Button>
                  {lessonId ? (
                    !isEditing ? (
                      <Button
                        type="primary"
                        size="large"
                        icon={<EditOutlined />}
                        className="!border-indigo-600 !bg-indigo-600 hover:!border-indigo-500 hover:!bg-indigo-500"
                        onClick={beginEdit}
                      >
                        Chỉnh sửa
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="primary"
                          size="large"
                          className="!border-indigo-600 !bg-indigo-600 hover:!border-indigo-500 hover:!bg-indigo-500"
                          loading={saving}
                          onClick={submitEdit}
                        >
                          Lưu
                        </Button>
                      </>
                    )
                  ) : null}
                </Space>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Basic metadata */}
              <div className="xl:col-span-5">
                <SectionShell
                  eyebrow="Tổng quan"
                  title="Thông tin cơ bản"
                  icon={<IdcardOutlined />}
                >
                  {!isEditing ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <MetaTile label="ID" icon={<IdcardOutlined />}>
                        {String(lesson.id ?? "—")}
                      </MetaTile>
                      <MetaTile
                        label="Learning path ID"
                        icon={<ApartmentOutlined />}
                      >
                        {String(lesson.learningPathId ?? "—")}
                      </MetaTile>
                      <MetaTile label="Slug" icon={<LinkOutlined />}>
                        {lesson.slug ? (
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
                            {lesson.slug}
                          </code>
                        ) : (
                          "—"
                        )}
                      </MetaTile>
                      <MetaTile label="Thứ tự" icon={<OrderedListOutlined />}>
                        {lesson.orderIndex == null
                          ? "—"
                          : String(lesson.orderIndex)}
                      </MetaTile>
                      <MetaTile label="Chủ đề" icon={<BookOutlined />}>
                        {lesson.topic || "—"}
                      </MetaTile>
                      <MetaTile label="Cấp độ" icon={<LineChartOutlined />}>
                        {lesson.level || "—"}
                      </MetaTile>
                      <div className="sm:col-span-2">
                        <MetaTile
                          label="Bài tập (Practice)"
                          icon={<FileTextOutlined />}
                        >
                          <span className="whitespace-pre-wrap font-normal">
                            {lesson.practice ?? "—"}
                          </span>
                        </MetaTile>
                      </div>
                      <div className="sm:col-span-2">
                        <MetaTile
                          label="Cập nhật lần cuối"
                          icon={<CalendarOutlined />}
                        >
                          {lesson.updatedAt || "—"}
                        </MetaTile>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Form.Item label="ID">
                        <Input disabled value={String(lesson.id ?? "")} />
                      </Form.Item>
                      <Form.Item label="Learning path ID">
                        <Input
                          disabled
                          value={String(lesson.learningPathId ?? "")}
                        />
                      </Form.Item>
                      <Form.Item
                        name="slug"
                        label="Slug"
                        rules={[
                          {
                            pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
                            message: "Slug chỉ gồm chữ, số và dấu gạch (-)",
                          },
                        ]}
                      >
                        <Input placeholder="lesson-my-slug" />
                      </Form.Item>
                      <Form.Item
                        name="orderIndex"
                        label="Thứ tự"
                        rules={[
                          {
                            required: true,
                            message: "Thứ tự là bắt buộc",
                          },
                        ]}
                      >
                        <InputNumber min={1} className="!w-full" />
                      </Form.Item>
                      <Form.Item
                        name="topic"
                        label="Chủ đề"
                        rules={[{ required: true, message: "Chọn chủ đề" }]}
                      >
                        <Select
                          options={TOPIC_OPTIONS}
                          showSearch
                          optionFilterProp="label"
                          placeholder="Chọn chủ đề"
                        />
                      </Form.Item>
                      <Form.Item
                        name="level"
                        label="Cấp độ"
                        rules={[{ required: true, message: "Chọn cấp độ" }]}
                      >
                        <Select
                          options={LEVEL_OPTIONS}
                          placeholder="Chọn cấp độ"
                        />
                      </Form.Item>
                      <div className="sm:col-span-2">
                        <Form.Item name="practice" label="Bài tập (Practice)">
                          <StaffTagPaginatedSelect placeholder="Chọn tag cho bài tập" />
                        </Form.Item>
                      </div>
                      <div className="sm:col-span-2">
                        <Text type="secondary" className="text-sm">
                          Cập nhật lần cuối (chỉ đọc): {lesson.updatedAt || "—"}
                        </Text>
                      </div>
                    </div>
                  )}
                </SectionShell>
              </div>

              {/* Video */}
              <div className="xl:col-span-7">
                <SectionShell
                  eyebrow="Đa phương tiện"
                  title="Video bài học"
                  icon={<VideoCameraOutlined />}
                >
                  {isEditing ? (
                    <Form.Item name="videoUrl" className="!mb-0">
                      <LessonVideoUrlField
                        value={form.getFieldValue("videoUrl") ?? ""}
                        onChange={(url) =>
                          form.setFieldValue("videoUrl", url ?? "")
                        }
                      />
                    </Form.Item>
                  ) : !videoUrlDisplay ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center">
                      <VideoCameraOutlined className="mx-auto mb-2 text-2xl text-slate-300" />
                      <Text type="secondary">Chưa có liên kết video.</Text>
                    </div>
                  ) : ytEmbed ? (
                    <div className="w-full space-y-4">
                      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-black shadow-md ring-1 ring-slate-200/90">
                        <div
                          className="relative aspect-video w-full"
                          style={{ minHeight: 200 }}
                        >
                          <iframe
                            title="Video bài học"
                            src={ytEmbed}
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                        <a
                          href={videoUrlDisplay}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1.5 break-all text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                        >
                          <LinkOutlined aria-hidden />
                          <span>{videoUrlDisplay}</span>
                        </a>
                        <a
                          href={videoUrlDisplay}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-sm font-medium text-slate-600 underline-offset-4 hover:text-indigo-600 hover:underline"
                        >
                          Mở trên YouTube →
                        </a>
                      </div>
                    </div>
                  ) : isDirectVideoUrl(videoUrlDisplay) ? (
                    <div className="space-y-3">
                      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-black shadow-inner">
                        <video
                          key={videoUrlDisplay}
                          src={videoUrlDisplay}
                          controls
                          playsInline
                          className="aspect-video max-h-[min(70vh,720px)] w-full object-contain"
                        />
                      </div>
                      <a
                        href={videoUrlDisplay}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 break-all text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                      >
                        <LinkOutlined />
                        {videoUrlDisplay}
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                      <Text type="secondary">
                        URL không phải YouTube hoặc file video trực tiếp — mở
                        liên kết để xem.
                      </Text>
                      <a
                        href={videoUrlDisplay}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 break-all text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                      >
                        <PlayCircleOutlined />
                        {videoUrlDisplay}
                      </a>
                    </div>
                  )}
                </SectionShell>
              </div>
            </div>

            {/* Main content */}
            <SectionShell
              eyebrow="Nội dung chính"
              title="Nội dung bài học"
              icon={<FileTextOutlined />}
              className="shadow-md"
            >
              {isEditing ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-9">
                    <div className="mb-2">
                      <Text type="secondary" className="text-sm">
                        Dùng <strong>Heading 1–3</strong> để chia mục (outline ở
                        bên phải). Có thể upload ảnh trong toolbar.
                      </Text>
                    </div>
                    <div className="mb-2 flex items-center justify-end">
                      <Button
                        size="small"
                        onClick={() => setManageImagesOpen(true)}
                        disabled={imageUrls.length === 0}
                      >
                        Manage images ({imageUrls.length})
                      </Button>
                    </div>
                    <div
                      ref={editorWrapperRef}
                      className="ckeditor-wrapper rounded border border-slate-200 overflow-hidden bg-white"
                    >
                      <style>{`
                        .ckeditor-wrapper .ck-editor__editable { min-height: 420px !important; padding: 18px 20px; }
                        .ckeditor-wrapper .ck-editor { min-height: 480px; }
                        .ckeditor-wrapper .ck-content h1,
                        .ckeditor-wrapper .ck-content h2,
                        .ckeditor-wrapper .ck-content h3 {
                          margin: 1.2em 0 0.6em;
                          font-weight: 800;
                          line-height: 1.25;
                          color: #0f172a;
                        }
                        .ckeditor-wrapper .ck-content h1 { font-size: 26px; }
                        .ckeditor-wrapper .ck-content h2 { font-size: 21px; }
                        .ckeditor-wrapper .ck-content h3 { font-size: 17px; }
                        .ckeditor-wrapper .ck-content ul,
                        .ckeditor-wrapper .ck-content ol {
                          padding-left: 1.5rem;
                          margin: 0.5rem 0 0.75rem;
                        }
                        .ckeditor-wrapper .ck-content li { margin: 0.25rem 0; }
                        .ckeditor-wrapper .ck-content img {
                          max-width: 100%;
                          height: auto;
                          border-radius: 10px;
                          border: 1px solid #e5e7eb;
                        }
                        .ckeditor-wrapper .ck-content hr {
                          border: 0;
                          border-top: 1px solid #e5e7eb;
                          margin: 1rem 0;
                        }
                        .ckeditor-wrapper .ck-content blockquote {
                          margin: 1rem 0;
                          padding: 0.75rem 1rem;
                          border-left: 4px solid #818cf8;
                          background: #eef2ff;
                          border-radius: 10px;
                          color: #334155;
                        }
                        .ckeditor-wrapper .ck-content table {
                          width: 100%;
                          border-collapse: separate;
                          border-spacing: 0;
                          margin: 1rem 0;
                        }
                        .ckeditor-wrapper .ck-content table th {
                          background: #f8fafc;
                          font-weight: 700;
                          color: #0f172a;
                        }
                        .ckeditor-wrapper .ck-content table td,
                        .ckeditor-wrapper .ck-content table th {
                          border: 1px solid #e5e7eb;
                          padding: 10px 12px;
                          vertical-align: top;
                        }
                        .ckeditor-wrapper .ck-content pre {
                          background: #0b1220;
                          color: #e5e7eb;
                          padding: 14px;
                          border-radius: 12px;
                          overflow: auto;
                        }
                        .ckeditor-wrapper .ck-content code {
                          background: #f1f5f9;
                          padding: 0 6px;
                          border-radius: 6px;
                          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
                            "Courier New", monospace;
                          font-size: 12.5px;
                        }
                        .ckeditor-wrapper .ck-content pre code {
                          background: transparent;
                          padding: 0;
                          border-radius: 0;
                          font-size: inherit;
                        }
                      `}</style>
                      <CKEditor
                        key={`${lesson.id}-${lessonId}-ck-${editorMountKey}`}
                        editor={ClassicEditor}
                        data={contentInitial}
                        config={{
                          licenseKey: "GPL",
                          extraPlugins: [
                            createCloudinaryImageUploadAdapterPlugin(),
                          ],
                        }}
                        onReady={(editorEd) => {
                          editorInstanceRef.current = editorEd;
                          const next = editorEd.getData() || "";
                          contentRef.current = next;
                          setContentHtml(next);
                        }}
                        onChange={(_event, editorEd) => {
                          const data = editorEd.getData();
                          contentRef.current = data;
                          setContentHtml(data);
                          if (contentSyncTimerRef.current) {
                            clearTimeout(contentSyncTimerRef.current);
                          }
                          contentSyncTimerRef.current = setTimeout(() => {
                            form.setFieldValue(
                              "content",
                              contentRef.current || "",
                            );
                          }, 250);
                        }}
                        onBlur={() => {
                          if (contentSyncTimerRef.current) {
                            clearTimeout(contentSyncTimerRef.current);
                          }
                          form.setFieldValue(
                            "content",
                            contentRef.current || "",
                          );
                        }}
                      />
                    </div>
                    <Form.Item name="content" hidden>
                      <Input type="hidden" />
                    </Form.Item>

                    <div className="mt-5">
                      <Form.Item
                        label="Thumbnail"
                        extra="Optional. jpg, png, gif, bmp, or webp."
                      >
                        <Upload.Dragger
                          name="thumbnail"
                          accept="image/*"
                          maxCount={1}
                          fileList={thumbnailFileList}
                          beforeUpload={beforeThumbnailUpload}
                          onRemove={handleRemoveThumbnail}
                          listType="picture"
                        >
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                          </p>
                          <p className="ant-upload-text">
                            Click or drag thumbnail image here
                          </p>
                        </Upload.Dragger>
                      </Form.Item>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
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
                          Thêm <strong>Heading 1</strong>,{" "}
                          <strong>Heading 2</strong> hoặc{" "}
                          <strong>Heading 3</strong> để thấy mục lục.
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
                </div>
              ) : (
                <div className="min-h-[280px] rounded-xl border border-slate-200/90 bg-slate-50/40 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:p-8">
                  {lesson.content ? (
                    <div
                      className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-indigo-600"
                      dangerouslySetInnerHTML={{
                        __html: normalizeLessonHtml(lesson.content),
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileTextOutlined className="mb-2 text-3xl text-slate-300" />
                      <Text type="secondary">
                        Chưa có nội dung cho bài học này.
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </SectionShell>

            <Modal
              open={manageImagesOpen}
              onCancel={() => setManageImagesOpen(false)}
              title="Manage images"
              footer={null}
              width={920}
              destroyOnClose
            >
              {imageUrls.length === 0 ? (
                <Empty description="No images found in this lesson content." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {imageUrls.map((url) => (
                    <div
                      key={url}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                    >
                      <div className="bg-slate-50">
                        <img
                          src={url}
                          alt="Lesson content image"
                          className="w-full h-36 object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <div className="text-xs text-slate-500 line-clamp-2">
                          {url}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Popconfirm
                            title="Remove this image from content?"
                            okText="Remove"
                            cancelText="Cancel"
                            onConfirm={() => handleRemoveImageFromContent(url)}
                            disabled={removingImageSrc === url}
                          >
                            <Button
                              size="small"
                              danger
                              disabled={removingImageSrc === url}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {removingImageSrc === url
                                ? "Removing..."
                                : "Remove"}
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Modal>
          </Form>
        )}
      </div>
    </div>
  );
}
