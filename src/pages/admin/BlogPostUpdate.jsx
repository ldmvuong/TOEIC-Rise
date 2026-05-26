import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
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
  Link,
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
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Image as AntImage,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import { ArrowLeftOutlined, InboxOutlined } from "@ant-design/icons";
import {
  BLOG_POST_THUMBNAIL_MAX_SIZE,
  BLOG_POST_SLUG_REGEX,
  BLOG_POST_SUMMARY_REGEX,
  BLOG_POST_TITLE_REGEX,
  isValidImageExtension,
  isValidBlogPostThumbnailSize,
} from "@/utils/validation";
import {
  deleteBlogPostImage,
  generateBlogSummaryStream,
  getAllBlogCategories,
  getBlogPostDetailForStaff,
  updateBlogPost,
  uploadBlogPostImage,
} from "@/api/api";

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const STATUS_COLOR = {
  DRAFT: "default",
  PUBLISHED: "green",
  ARCHIVED: "orange",
};

function extractHeadingOutline(html) {
  if (!html || typeof window === "undefined") return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return [...doc.querySelectorAll("h1, h2, h3")].map((el) => ({
      level: Number(el.tagName[1]),
      text: el.textContent?.trim() || "(empty heading)",
    }));
  } catch {
    return [];
  }
}

class BlogPostImageUploadAdapter {
  constructor(loader, onUploaded) {
    this.loader = loader;
    this.onUploaded = onUploaded;
  }

  upload() {
    return this.loader.file.then((file) => {
      const formData = new FormData();
      formData.append("image", file);
      return uploadBlogPostImage(formData).then((res) => {
        const url = res?.data;
        if (!url) throw new Error("Image upload succeeded but no URL returned");
        this.onUploaded?.(url);
        return { default: url };
      });
    });
  }

  abort() {}
}

function createBlogPostImageUploadAdapterPlugin(onUploaded) {
  return function BlogPostImageUploadAdapterPlugin(editor) {
    const fileRepository = editor.plugins.get("FileRepository");
    fileRepository.createUploadAdapter = (loader) =>
      new BlogPostImageUploadAdapter(loader, onUploaded);
  };
}

const BlogPostUpdatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [post, setPost] = useState(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [contentHtml, setContentHtml] = useState("");

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailFileList, setThumbnailFileList] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [manageImagesOpen, setManageImagesOpen] = useState(false);
  const [deletingImageUrl, setDeletingImageUrl] = useState(null);

  const [generateSummaryModalOpen, setGenerateSummaryModalOpen] =
    useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatedSummaryText, setGeneratedSummaryText] = useState("");
  const allowNavigationRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  const confirmLeavePage = useCallback(
    (onOk, onCancel) => {
      Modal.confirm({
        title: "Leave this page?",
        content: "Your current input may be lost if you go back now.",
        okText: "Leave",
        cancelText: "Stay",
        okButtonProps: { danger: true },
        onOk: () => {
          allowNavigationRef.current = true;
          onOk?.();
        },
        onCancel,
      });
    },
    [],
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      confirmLeavePage(
        () => blocker.proceed(),
        () => blocker.reset(),
      );
    }
  }, [blocker, confirmLeavePage]);

  const outline = useMemo(
    () => extractHeadingOutline(contentHtml),
    [contentHtml],
  );

  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    return url.split("#")[0].split("?")[0].trim();
  };

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
    setUploadedImageUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }, []);

  const loadDetail = useCallback(async () => {
    if (!id) {
      setError("Invalid post id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getBlogPostDetailForStaff(id);
      const data = res?.data ?? null;
      setPost(data);

      form.setFieldsValue({
        title: data?.title ?? "",
        slug: data?.slug ?? "",
        summary: data?.summary ?? "",
        status: data?.status ?? "DRAFT",
        categoryId: data?.categoryId ?? undefined,
      });

      const initialContent = data?.content ?? "";
      setContentHtml(initialContent);
      const urls = extractImageUrlsFromHtml(initialContent);
      setUploadedImageUrls(
        [...new Set(urls.filter(Boolean))],
      );

      setThumbnailFile(null);
      setThumbnailFileList([]);
    } catch (e) {
      setPost(null);
      setError(e?.message || "Unable to load post");
    } finally {
      setLoading(false);
    }
  }, [id, form, extractImageUrlsFromHtml]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const query = new URLSearchParams({
        page: "0",
        size: "200",
        sortBy: "updatedAt",
        direction: "DESC",
      }).toString();
      const res = await getAllBlogCategories(query);
      const data = res?.data ?? {};
      setCategories(Array.isArray(data.result) ? data.result : []);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const beforeThumbnailUpload = (file) => {
    if (!isValidImageExtension(file.name)) {
      message.error("Use an image file (jpg, png, gif, bmp, webp)");
      return Upload.LIST_IGNORE;
    }
    if (!isValidBlogPostThumbnailSize(file.size)) {
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
  };

  const handleRemoveThumbnail = (file) => {
    const url = file?.url;
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    setThumbnailFile(null);
    setThumbnailFileList([]);
  };

  const handleGenerateSummary = () => {
    const title = String(form.getFieldValue("title") ?? "").trim();
    const content = String(contentHtml ?? "").trim();
    if (!title) {
      message.error("Please enter a title first");
      return;
    }
    if (content.replace(/<[^>]*>/g, "").trim().length < 50) {
      message.error("Please write at least 50 characters of content first");
      return;
    }

    setGeneratedSummaryText("");
    setGenerateSummaryModalOpen(true);
    setGeneratingSummary(true);

    generateBlogSummaryStream(
      { title, content },
      {
        onChunk: (text) => setGeneratedSummaryText((prev) => prev + text),
        onDone: () => setGeneratingSummary(false),
        onError: (err) => {
          setGeneratingSummary(false);
          message.error(err?.message || "Failed to generate summary");
        },
      },
    );
  };

  const handleUseGeneratedSummary = () => {
    const next = (generatedSummaryText ?? "").trim();
    if (!next) return;
    form.setFieldsValue({ summary: next });
    setGenerateSummaryModalOpen(false);
    message.success("Applied generated summary");
  };

  const handleDeleteUploadedImage = async (imageUrl) => {
    if (!imageUrl) return;
    const usedUrls = extractImageUrlsFromHtml(contentHtml);
    const isInUse = usedUrls.some(
      (u) => normalizeImageUrl(u) === normalizeImageUrl(imageUrl),
    );
    if (isInUse) {
      message.error("Cannot delete: this image is still used in CKEditor content.");
      return;
    }

    try {
      setDeletingImageUrl(imageUrl);
      await deleteBlogPostImage(imageUrl);
      setUploadedImageUrls((prev) =>
        prev.filter((u) => normalizeImageUrl(u) !== normalizeImageUrl(imageUrl)),
      );
      message.success("Image deleted");
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "Failed to delete image");
    } finally {
      setDeletingImageUrl(null);
    }
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
        Link,
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
        "link",
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
        createBlogPostImageUploadAdapterPlugin(handleImageUploaded),
      ],
    }),
    [handleImageUploaded],
  );

  const onFinish = async (values) => {
    if (!id) return;
    const raw = (contentHtml || "").trim();
    if (raw.length < 50) {
      message.error("Content must be at least 50 characters (including HTML)");
      return;
    }

    const fd = new FormData();
    fd.append("title", values.title.trim());
    fd.append("slug", values.slug.trim().toLowerCase());
    fd.append("summary", values.summary.trim());
    fd.append("content", raw);
    fd.append("status", values.status);
    if (values.categoryId != null) {
      fd.append("categoryId", String(values.categoryId));
    }
    if (thumbnailFile) {
      fd.append("thumbnail", thumbnailFile);
    }

    setSubmitting(true);
    try {
      await updateBlogPost(id, fd);
      message.success("Blog post updated");
      allowNavigationRef.current = true;
      navigate(`/admin/blog-posts/${id}`);
    } catch (e) {
      notification.error({
        message: "Could not update post",
        description:
          e?.message ||
          e?.response?.data?.message ||
          "Please check fields and try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-4 max-w-2xl">
        <Text type="danger">{error || "Post not found"}</Text>
        <div className="mt-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const status = post.status;
  const statusColor = STATUS_COLOR[status] ?? "default";

  return (
    <div className="max-w-[1500px] mx-auto p-4 pb-12">
      <Space direction="vertical" size="large" className="w-full">
        <Space wrap align="center">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => confirmLeavePage(() => navigate(-1))}
          >
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Edit post
          </Title>
          {status ? (
            <Tag color={statusColor}>{String(status)}</Tag>
          ) : null}
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          scrollToFirstError
          className="w-full"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={18}>
              <Card title="Post details" className="shadow-sm">
                <Form.Item
                  label="Title"
                  name="title"
                  rules={[
                    { required: true, message: "Title is required" },
                    { whitespace: true, message: "Title cannot be blank" },
                    {
                      pattern: BLOG_POST_TITLE_REGEX,
                      message:
                        "5–150 characters: letters, digits, spaces, and . , ! ? : ' \" ( ) -",
                    },
                  ]}
                >
                  <Input maxLength={150} showCount placeholder="Post title" />
                </Form.Item>

                <Form.Item
                  label="Slug"
                  name="slug"
                  rules={[
                    { required: true, message: "Slug is required" },
                    { whitespace: true, message: "Slug cannot be blank" },
                    {
                      pattern: BLOG_POST_SLUG_REGEX,
                      message:
                        "Lowercase letters, digits, hyphens only (e.g. my-first-post)",
                    },
                  ]}
                >
                  <Input
                    maxLength={50}
                    showCount
                    placeholder="url-friendly-slug"
                  />
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Status"
                      name="status"
                      rules={[{ required: true, message: "Status is required" }]}
                    >
                      <Select options={STATUS_OPTIONS} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Category" name="categoryId">
                      <Select
                        allowClear
                        loading={categoriesLoading}
                        placeholder="Select category"
                        options={categories.map((c) => ({
                          value: c.id,
                          label: `${c.name} (${c.slug})`,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label={
                    <Space align="center" size={8}>
                      <span>Summary</span>
                      <Button
                        size="small"
                        type="default"
                        onClick={handleGenerateSummary}
                        loading={generatingSummary}
                        disabled={submitting}
                      >
                        Generate summary
                      </Button>
                    </Space>
                  }
                  name="summary"
                  rules={[
                    { required: true, message: "Summary is required" },
                    { whitespace: true, message: "Summary cannot be blank" },
                    {
                      pattern: BLOG_POST_SUMMARY_REGEX,
                      message:
                        "10–500 characters: letters, digits, spaces, and . , ! ? : ' \" ( ) -",
                    },
                  ]}
                >
                  <TextArea
                    rows={4}
                    maxLength={500}
                    showCount
                    placeholder="Short summary for listings and SEO"
                  />
                </Form.Item>

                <div className="mb-2">
                  <Text strong>Content</Text>
                  <div className="mt-1 mb-2">
                    <Text type="secondary" className="text-sm">
                      Use <strong>Heading 1–3</strong> for sections (outline on
                      the right). You can upload images with the toolbar.
                    </Text>
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
                  <div className="ckeditor-wrapper rounded border border-slate-200 overflow-hidden bg-white">
                    <style>{`
                      .ckeditor-wrapper .ck-editor__editable { min-height: 420px !important; padding: 18px 20px; }
                      .ckeditor-wrapper .ck-editor { min-height: 480px; }
                      .ckeditor-wrapper .ck-content .table { overflow-x: auto; }
                      .ckeditor-wrapper .ck-content .table table,
                      .ckeditor-wrapper .ck-content table {
                        width: auto !important;
                        max-width: 100%;
                        table-layout: auto !important;
                        border-collapse: separate;
                        border-spacing: 0;
                      }
                      .ckeditor-wrapper .ck-content table td,
                      .ckeditor-wrapper .ck-content table th {
                        width: auto !important;
                        min-width: 0;
                        white-space: normal;
                        word-break: break-word;
                      }
                    `}</style>
                    <CKEditor
                      editor={ClassicEditor}
                      data={contentHtml}
                      config={blogPostEditorConfiguration}
                      onChange={(_event, editor) => setContentHtml(editor.getData())}
                    />
                  </div>
                </div>

                <Form.Item
                  label="Thumbnail"
                  extra="Optional. Upload to replace the current thumbnail."
                >
                  {post.thumbnailUrl ? (
                    <div className="mb-3">
                      <Text type="secondary" className="text-sm block mb-1">
                        Current thumbnail
                      </Text>
                      <div className="rounded-lg overflow-hidden bg-slate-100 max-h-[220px]">
                        <AntImage
                          src={post.thumbnailUrl}
                          alt=""
                          className="w-full object-cover"
                          style={{ maxHeight: 220 }}
                          preview
                        />
                      </div>
                    </div>
                  ) : null}

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
                      Click or drag a new thumbnail image here
                    </p>
                  </Upload.Dragger>
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      size="large"
                    >
                      Save changes
                    </Button>
                    <Button
                      onClick={() =>
                        confirmLeavePage(() => navigate(`/admin/blog-posts/${id}`))
                      }
                    >
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={6}>
              <Card
                title="Outline (from headings)"
                className="shadow-sm lg:sticky lg:top-4 rounded-2xl border-slate-200 overflow-hidden"
                styles={{
                  header: {
                    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: "1px solid #e2e8f0",
                  },
                  body: { maxHeight: "70vh", overflowY: "auto", padding: 12 },
                }}
              >
                {outline.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500 leading-relaxed">
                    Add <strong>Heading 1</strong>, <strong>Heading 2</strong>, or{" "}
                    <strong>Heading 3</strong> in the editor to build the outline.
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 px-1 text-xs font-medium text-slate-500">
                      {outline.length} heading{outline.length > 1 ? "s" : ""}
                    </div>
                    <ul className="list-none pl-0 m-0 space-y-1.5">
                    {outline.map((item, idx) => (
                      <li
                        key={`${idx}-${item.text}`}
                        style={{ marginLeft: (item.level - 1) * 10 }}
                        className={`group rounded-lg border px-2.5 py-2 transition-colors ${
                          item.level === 1
                            ? "border-indigo-200 bg-indigo-50/70"
                            : item.level === 2
                              ? "border-slate-200 bg-white hover:bg-slate-50"
                              : "border-transparent bg-slate-50/40 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-[6px] h-1.5 w-1.5 rounded-full shrink-0 ${
                              item.level === 1
                                ? "bg-indigo-500"
                                : item.level === 2
                                  ? "bg-slate-400"
                                  : "bg-slate-300"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-0.5">
                              H{item.level}
                            </div>
                            <Text
                              className={`block break-words leading-snug ${
                                item.level === 1
                                  ? "font-semibold text-slate-900"
                                  : item.level === 2
                                    ? "text-slate-700"
                                    : "text-slate-600 text-[13px]"
                              }`}
                            >
                              {item.text}
                            </Text>
                          </div>
                        </div>
                      </li>
                    ))}
                    </ul>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Form>
      </Space>

      <Modal
        open={generateSummaryModalOpen}
        title="Generate blog post summary"
        onCancel={() => {
          if (!generatingSummary) setGenerateSummaryModalOpen(false);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => setGenerateSummaryModalOpen(false)}
            disabled={generatingSummary}
          >
            Cancel
          </Button>,
          <Button
            key="use"
            type="primary"
            onClick={handleUseGeneratedSummary}
            disabled={generatingSummary || !generatedSummaryText.trim()}
          >
            Use this summary
          </Button>,
        ]}
        width={720}
        destroyOnHidden
      >
        <div className="min-h-[160px]">
          {generatingSummary && !generatedSummaryText ? (
            <div className="text-slate-500">Generating…</div>
          ) : null}
          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {generatedSummaryText || "—"}
          </div>
        </div>
      </Modal>

      <Modal
        open={manageImagesOpen}
        onCancel={() => setManageImagesOpen(false)}
        title="Manage images"
        footer={null}
        width={920}
        destroyOnHidden
      >
        {uploadedImageUrls.length === 0 ? (
          <Empty description="No images found in content." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedImageUrls.map((url) => (
              <div
                key={url}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white"
              >
                <div className="bg-slate-50">
                  <img src={url} alt="" className="w-full h-36 object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-xs text-slate-500 line-clamp-2">{url}</div>
                  <div className="mt-3 flex justify-end">
                    <Popconfirm
                      title="Delete this image from storage?"
                      description="Only allowed if the image is not used in the editor content."
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
    </div>
  );
};

export default BlogPostUpdatePage;