import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import parse from "html-react-parser";
import { Button, Card, Col, Image, Row, Space, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { changeBlogPostStatus, getBlogPostDetailForStaff } from "@/api/api";
import { message, Popconfirm } from "antd";

const { Title, Text } = Typography;

const STATUS_COLOR = {
  DRAFT: "default",
  PUBLISHED: "green",
  ARCHIVED: "orange",
};

function formatDateTime(value) {
  if (value == null || value === "") return "—";
  const normalized =
    typeof value === "string" ? value.replace(" ", "T") : value;
  const d = dayjs(normalized);
  return d.isValid() ? d.format("DD-MM-YYYY HH:mm:ss") : String(value);
}

/**
 * Build stable ids for h1–h3 and return HTML + TOC entries for anchor links.
 */
function injectHeadingIdsAndToc(html) {
  if (!html || typeof html !== "string") {
    return { html: html || "", items: [] };
  }
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3");
    const items = [];
    const used = new Set();

    headings.forEach((el, index) => {
      const text = el.textContent?.trim() || "";
      if (!text) return;

      let base = text
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 72);
      if (!base) base = `section-${index}`;

      let id = base;
      let n = 0;
      while (used.has(id)) {
        id = `${base}-${++n}`;
      }
      used.add(id);
      el.id = id;

      items.push({
        id,
        level: Number(el.tagName[1]),
        text,
      });
    });

    return { html: doc.body.innerHTML, items };
  } catch {
    return { html, items: [] };
  }
}

function scrollToHeading(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

const BlogPostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [post, setPost] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError("Invalid post id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getBlogPostDetailForStaff(id);
      setPost(res?.data ?? null);
    } catch (e) {
      setPost(null);
      setError(e?.message || "Unable to load post");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const { contentHtml, tocItems } = useMemo(() => {
    const { html, items } = injectHeadingIdsAndToc(post?.content);
    return { contentHtml: html, tocItems: items };
  }, [post?.content]);

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

  const changeStatus = async (nextStatus) => {
    if (!post?.id) return;
    if (!nextStatus || nextStatus === status) return;
    setChangingStatus(true);
    try {
      await changeBlogPostStatus(post.id, nextStatus);
      message.success("Blog post status updated");
      await load();
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Failed to update status",
      );
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 pb-12">
      <Space direction="vertical" size="large" className="w-full">
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            type="primary"
            onClick={() => navigate(`/admin/blog-posts/${post.id}/edit`)}
          >
            Edit
          </Button>
          {post.categoryId != null && (
            <Link to={`/admin/blog-categories/${post.categoryId}`}>
              <Button type="link">
                Category: {post.categoryName || "View"}
              </Button>
            </Link>
          )}
        </Space>

        <Card className="shadow-sm">
          <Space direction="vertical" size="middle" className="w-full">
            {post.thumbnailUrl ? (
              <div className="relative rounded-lg overflow-hidden bg-slate-100 h-[360px] max-h-[360px]">
                <Image
                  src={post.thumbnailUrl}
                  alt=""
                  preview={false}
                  className="pointer-events-none absolute inset-0 !h-full !w-full scale-105"
                  style={{
                    height: "100%",
                    width: "100%",
                    objectFit: "cover",
                    display: "block",
                    filter: "blur(14px)",
                    opacity: 0.78,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src={post.thumbnailUrl}
                    alt=""
                    className="max-h-full max-w-full"
                    style={{
                      height: "auto",
                      width: "auto",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                    preview
                  />
                </div>
              </div>
            ) : null}

            <div>
              <Space wrap className="mb-2">
                {status ? (
                  <Tag color={statusColor}>{String(status)}</Tag>
                ) : null}
                {post.views != null ? (
                  <Text type="secondary">
                    <EyeOutlined className="mr-1" />
                    {Number(post.views).toLocaleString()} views
                  </Text>
                ) : null}
              </Space>
              <Title level={2} style={{ marginBottom: 8 }}>
                {post.title || "Untitled"}
              </Title>
              {post.summary ? (
                <Text type="secondary" className="text-base block">
                  {post.summary}
                </Text>
              ) : null}
            </div>
          </Space>
        </Card>

        <Card
          title="Details"
          className="rounded-2xl border-slate-200 shadow-sm overflow-hidden"
          styles={{
            header: {
              background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
              borderBottom: "1px solid #e2e8f0",
            },
            body: { padding: 0 },
          }}
        >
          <div className="divide-y divide-slate-100">
            <div className="px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Slug
              </div>
              <code className="block text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 break-all">
                {post.slug || "—"}
              </code>
            </div>

            <div className="px-5 py-4 bg-slate-50/50">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Status
              </div>
              {status ? (
                <Space direction="vertical" size={12} className="w-full">
                  <Tag
                    color={statusColor}
                    className="m-0 px-2.5 py-0.5 text-sm"
                  >
                    {String(status)}
                  </Tag>
                  <div className="flex flex-wrap gap-2">
                    <Popconfirm
                      title="Set status to DRAFT?"
                      okText="Yes"
                      cancelText="No"
                      disabled={changingStatus || status === "DRAFT"}
                      onConfirm={() => changeStatus("DRAFT")}
                    >
                      <Button
                        size="small"
                        disabled={changingStatus || status === "DRAFT"}
                      >
                        Draft
                      </Button>
                    </Popconfirm>

                    <Popconfirm
                      title="Set status to PUBLISHED?"
                      okText="Yes"
                      cancelText="No"
                      disabled={changingStatus || status === "PUBLISHED"}
                      onConfirm={() => changeStatus("PUBLISHED")}
                    >
                      <Button
                        size="small"
                        type="primary"
                        disabled={changingStatus || status === "PUBLISHED"}
                      >
                        Published
                      </Button>
                    </Popconfirm>

                    <Popconfirm
                      title="Set status to ARCHIVED?"
                      okText="Yes"
                      cancelText="No"
                      disabled={changingStatus || status === "ARCHIVED"}
                      onConfirm={() => changeStatus("ARCHIVED")}
                    >
                      <Button
                        size="small"
                        disabled={changingStatus || status === "ARCHIVED"}
                      >
                        Archived
                      </Button>
                    </Popconfirm>
                  </div>
                </Space>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </div>

            <div className="px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Views
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <EyeOutlined className="text-slate-400" />
                <span className="text-base font-medium tabular-nums">
                  {post.views != null
                    ? Number(post.views).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50/50">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Timeline
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500">
                    <CalendarOutlined />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Created</div>
                    <div className="text-sm text-slate-800 font-medium">
                      {formatDateTime(post.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500">
                    <CalendarOutlined />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Updated</div>
                    <div className="text-sm text-slate-800 font-medium">
                      {formatDateTime(post.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Author
              </div>
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <UserOutlined />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {post.authorName || "—"}
                  </div>
                  {post.authorEmail ? (
                    <div className="text-xs text-slate-500 mt-0.5 break-all">
                      {post.authorEmail}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50/50">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Category
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-sm font-medium text-slate-900">
                  {post.categoryName || "—"}
                </div>
                {post.categorySlug ? (
                  <code className="mt-1 block text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 border border-slate-100">
                    {post.categorySlug}
                  </code>
                ) : null}
                {post.categoryIsActive != null ? (
                  <Tag
                    color={post.categoryIsActive ? "green" : "default"}
                    className="mt-2 m-0"
                  >
                    {post.categoryIsActive
                      ? "Category active"
                      : "Category inactive"}
                  </Tag>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={18}>
            <Card title="Content" className="shadow-sm">
              <div
                className="blog-post-detail-content text-slate-800 leading-relaxed
                  [&_table]:border-collapse [&_table]:border [&_table]:border-slate-200 [&_table]:my-4
                  [&_td]:border [&_td]:border-slate-200 [&_td]:p-2
                  [&_th]:border [&_th]:border-slate-200 [&_th]:p-2 [&_th]:bg-slate-50
                  [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded
                  [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:scroll-mt-24
                  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:scroll-mt-24
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:scroll-mt-24
                  [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
              >
                {contentHtml ? (
                  parse(contentHtml)
                ) : (
                  <Text type="secondary">No content</Text>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={6}>
            {tocItems.length > 0 ? (
              <Card
                title="On this page"
                className="rounded-2xl border-slate-200 shadow-sm mb-4 lg:sticky lg:top-4 lg:z-10 overflow-hidden"
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
                <nav aria-label="Table of contents">
                  <ul className="list-none m-0 p-0 space-y-1.5">
                    {tocItems.map((item) => (
                      <li
                        key={item.id}
                        style={{ marginLeft: (item.level - 1) * 10 }}
                        className="text-sm"
                      >
                        <a
                          href={`#${item.id}`}
                          className={`group flex items-start gap-2 no-underline rounded-lg px-2.5 py-2 border transition-all ${
                            item.level === 1
                              ? "border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70"
                              : item.level === 2
                                ? "border-slate-200 bg-white hover:bg-slate-50"
                                : "border-transparent bg-transparent hover:bg-slate-50"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToHeading(item.id);
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
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </Card>
            ) : null}
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default BlogPostDetailPage;
