import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Form,
  Input,
  Row,
  Space,
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import { ArrowLeftOutlined, InboxOutlined } from "@ant-design/icons";
import {
  AVATAR_MAX_SIZE,
  BLOG_POST_SLUG_REGEX,
  BLOG_POST_SUMMARY_REGEX,
  BLOG_POST_TITLE_REGEX,
  isValidImageExtension,
  isValidImageSize,
} from "@/utils/validation";
import { createBlogPost, getBlogCategoryById, uploadBlogPostImage } from "@/api/api";

const { Title, Text } = Typography;
const { TextArea } = Input;

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
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then((file) => {
      const formData = new FormData();
      // Backend expects Multipart @ModelAttribute BlogPostImageRequest.image
      formData.append("image", file);
      return uploadBlogPostImage(formData).then((res) => {
        const url = res?.data;
        if (!url) {
          throw new Error("Image upload succeeded but no URL returned");
        }
        return { default: url };
      });
    });
  }

  abort() {
    // Optional: axios request cancellation can be added later if needed.
  }
}

function BlogPostImageUploadAdapterPlugin(editor) {
  const fileRepository = editor.plugins.get("FileRepository");
  fileRepository.createUploadAdapter = (loader) =>
    new BlogPostImageUploadAdapter(loader);
}

const BlogPostCreatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loadingCategory, setLoadingCategory] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [category, setCategory] = useState(null);

  const [contentHtml, setContentHtml] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const outline = useMemo(
    () => extractHeadingOutline(contentHtml),
    [contentHtml],
  );

  const loadCategory = useCallback(async () => {
    if (!id) {
      setCategoryError("Invalid category");
      setLoadingCategory(false);
      return;
    }
    setLoadingCategory(true);
    setCategoryError("");
    try {
      const res = await getBlogCategoryById(id);
      setCategory(res?.data ?? null);
      if (!res?.data?.slug) {
        setCategoryError("Category has no slug");
      }
    } catch (e) {
      setCategory(null);
      setCategoryError(e?.message || "Category not found");
    } finally {
      setLoadingCategory(false);
    }
  }, [id]);

  useEffect(() => {
    loadCategory();
  }, [loadCategory]);

  const beforeThumbnailUpload = (file) => {
    if (!isValidImageExtension(file.name)) {
      message.error("Use an image file (jpg, png, gif, bmp, webp)");
      return Upload.LIST_IGNORE;
    }
    if (!isValidImageSize(file.size)) {
      message.error(
        `Image must be ${AVATAR_MAX_SIZE / (1024 * 1024)}MB or smaller`,
      );
      return Upload.LIST_IGNORE;
    }
    setThumbnailFile(file);
    const url = URL.createObjectURL(file);
    setFileList([
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
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
    setThumbnailFile(null);
    setFileList([]);
  };

  const onFinish = async (values) => {
    if (!category?.slug) {
      message.error("Missing category");
      return;
    }
    if (!thumbnailFile) {
      message.error("Please upload a thumbnail image");
      return;
    }
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
    fd.append("thumbnail", thumbnailFile);

    setSubmitting(true);
    try {
      await createBlogPost(category.slug, fd);
      message.success("Blog post created");
      navigate(`/admin/blog-categories/${id}`);
    } catch (e) {
      notification.error({
        message: "Could not create post",
        description:
          e?.message ||
          e?.response?.data?.message ||
          "Please check fields and try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const blogPostEditorConfiguration = {
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
    // Classic build includes Table + merge; tableProperties plugins are not in this build.
    table: {
      contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
    },
    extraPlugins: [BlogPostImageUploadAdapterPlugin],
  };

  if (loadingCategory) {
    return (
      <div className="p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (categoryError || !category?.slug) {
    return (
      <div className="p-4 max-w-2xl">
        <Text type="danger">{categoryError || "Category not found"}</Text>
        <div className="mt-4">
          <Button onClick={() => navigate("/admin/blog-categories")}>
            Back to categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto p-4 pb-12">
      <Space direction="vertical" size="large" className="w-full">
        <Space wrap align="center">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/admin/blog-categories/${id}`)}
          >
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            New post
          </Title>
          <Text type="secondary">
            Category: <strong>{category.name}</strong>{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              {category.slug}
            </code>
          </Text>
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

                <Form.Item
                  label="Summary"
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
                      Use <strong>Heading 1–3</strong> for sections (outline
                      updates on the right). Tables: insert from the toolbar,
                      then use the table balloon for rows/columns and{" "}
                      <strong>Merge cells</strong>.
                    </Text>
                  </div>
                  <div className="ckeditor-wrapper rounded border border-slate-200 overflow-hidden bg-white">
                    <style>{`
                      .ckeditor-wrapper {
                        width: 100%;
                        display: block;
                      }
                      .ckeditor-wrapper .ck-editor__editable {
                        min-height: 420px !important;
                        padding: 18px 20px;
                        background: #fff;
                        font-size: 14px;
                        line-height: 1.75;
                        color: #0f172a;
                        box-sizing: border-box;
                        width: 100%;
                      }
                      .ckeditor-wrapper .ck-editor__editable:focus {
                        outline: none;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
                      }
                      .ckeditor-wrapper .ck-editor {
                        min-height: 480px;
                        width: 100%;
                      }
                      .ckeditor-wrapper .ck-editor__main {
                        width: 100%;
                      }
                      .ckeditor-wrapper .ck-editor__top {
                        width: 100%;
                      }
                      .ckeditor-wrapper .ck-toolbar {
                        background: linear-gradient(#f8fafc, #f1f5f9);
                        border-bottom: 1px solid #e2e8f0;
                        width: 100%;
                        padding: 0 8px;
                      }
                      .ckeditor-wrapper .ck-toolbar__items {
                        flex-wrap: wrap;
                        gap: 4px;
                        width: 100%;
                        justify-content: flex-start;
                      }
                      .ckeditor-wrapper .ck-content {
                        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
                          "Apple Color Emoji", "Segoe UI Emoji";
                      }
                      .ckeditor-wrapper .ck-content a {
                        color: #2563eb;
                        text-decoration: none;
                        border-bottom: 1px solid rgba(37, 99, 235, 0.35);
                      }
                      .ckeditor-wrapper .ck-content a:hover {
                        color: #1d4ed8;
                        border-bottom-color: rgba(29, 78, 216, 0.6);
                      }
                      .ckeditor-wrapper .ck-content p {
                        margin: 0 0 0.75rem;
                      }
                      .ckeditor-wrapper .ck-content h1,
                      .ckeditor-wrapper .ck-content h2,
                      .ckeditor-wrapper .ck-content h3 {
                        margin: 1.2em 0 0.6em;
                        font-weight: 800;
                        line-height: 1.25;
                        color: #0f172a;
                      }
                      .ckeditor-wrapper .ck-content h1 {
                        font-size: 26px;
                      }
                      .ckeditor-wrapper .ck-content h2 {
                        font-size: 21px;
                      }
                      .ckeditor-wrapper .ck-content h3 {
                        font-size: 17px;
                      }
                      .ckeditor-wrapper .ck-content ul,
                      .ckeditor-wrapper .ck-content ol {
                        padding-left: 1.5rem;
                        margin: 0.5rem 0 0.75rem;
                      }
                      .ckeditor-wrapper .ck-content li {
                        margin: 0.25rem 0;
                      }
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
                      editor={ClassicEditor}
                      data={contentHtml}
                      config={blogPostEditorConfiguration}
                      onChange={(_event, editor) => {
                        setContentHtml(editor.getData());
                      }}
                    />
                  </div>
                </div>

                <Form.Item
                  label="Thumbnail"
                  required
                  extra="Required. jpg, png, gif, bmp, or webp (same rules as profile avatar)."
                >
                  <Upload.Dragger
                    name="thumbnail"
                    accept="image/*"
                    maxCount={1}
                    fileList={fileList}
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

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      size="large"
                    >
                      Publish post
                    </Button>
                    <Button
                      onClick={() => navigate(`/admin/blog-categories/${id}`)}
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
                className="shadow-sm lg:sticky lg:top-4"
                styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
              >
                {outline.length === 0 ? (
                  <Text type="secondary">
                    Add <strong>Heading 1</strong>, <strong>Heading 2</strong>,
                    or <strong>Heading 3</strong> in the editor to see the
                    outline here.
                  </Text>
                ) : (
                  <ul className="list-none pl-0 m-0 space-y-2">
                    {outline.map((item, idx) => (
                      <li
                        key={`${idx}-${item.text}`}
                        className="text-sm border-l-2 border-indigo-200 pl-3"
                        style={{
                          marginLeft: (item.level - 1) * 12,
                        }}
                      >
                        <Text
                          type={
                            item.level === 1
                              ? undefined
                              : item.level === 2
                                ? "secondary"
                                : "secondary"
                          }
                          className={
                            item.level === 1
                              ? "font-semibold text-slate-900"
                              : ""
                          }
                        >
                          H{item.level}: {item.text}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Col>
          </Row>
        </Form>
      </Space>
    </div>
  );
};

export default BlogPostCreatePage;
