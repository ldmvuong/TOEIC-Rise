import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import parse from "html-react-parser";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Image,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getBlogPostDetailForStaff } from "@/api/api";

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

  return (
    <div className="max-w-5xl mx-auto p-4 pb-12">
      <Space direction="vertical" size="large" className="w-full">
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          {post.categoryId != null && (
            <Link to={`/admin/blog-categories/${post.categoryId}`}>
              <Button type="link">Category: {post.categoryName || "View"}</Button>
            </Link>
          )}
        </Space>

        <Card className="shadow-sm">
          <Space direction="vertical" size="middle" className="w-full">
            {post.thumbnailUrl ? (
              <div className="rounded-lg overflow-hidden bg-slate-100 max-h-[360px]">
                <Image
                  src={post.thumbnailUrl}
                  alt=""
                  className="w-full object-cover"
                  style={{ maxHeight: 360 }}
                  preview
                />
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

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
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
          <Col xs={24} lg={8}>
            {tocItems.length > 0 ? (
              <Card
                title="On this page"
                className="shadow-sm mb-4 lg:sticky lg:top-4 lg:z-10"
                styles={{
                  body: { maxHeight: "min(70vh, 480px)", overflowY: "auto", padding: "12px 16px" },
                }}
              >
                <nav aria-label="Table of contents">
                  <ul className="list-none m-0 p-0 space-y-1.5">
                    {tocItems.map((item) => (
                      <li
                        key={item.id}
                        style={{ paddingLeft: (item.level - 1) * 12 }}
                        className="text-sm border-l-2 border-indigo-200 pl-2"
                      >
                        <a
                          href={`#${item.id}`}
                          className="text-slate-700 hover:text-indigo-600 no-underline break-words"
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToHeading(item.id);
                          }}
                        >
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </Card>
            ) : null}
            <Card title="Details" className="shadow-sm">
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Slug">
                  <code className="text-xs">{post.slug || "—"}</code>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {status ? (
                    <Tag color={statusColor}>{String(status)}</Tag>
                  ) : (
                    "—"
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Views">
                  {post.views != null ? Number(post.views).toLocaleString() : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  <CalendarOutlined className="mr-1" />
                  {formatDateTime(post.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Updated">
                  <CalendarOutlined className="mr-1" />
                  {formatDateTime(post.updatedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Author">
                  <UserOutlined className="mr-1" />
                  {post.authorName || "—"}
                  {post.authorEmail ? (
                    <div className="text-xs text-slate-500 mt-1">{post.authorEmail}</div>
                  ) : null}
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  {post.categoryName || "—"}
                  {post.categorySlug ? (
                    <div>
                      <code className="text-xs">{post.categorySlug}</code>
                    </div>
                  ) : null}
                  {post.categoryIsActive != null ? (
                    <Tag color={post.categoryIsActive ? "green" : "default"} className="mt-1">
                      {post.categoryIsActive ? "Category active" : "Category inactive"}
                    </Tag>
                  ) : null}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default BlogPostDetailPage;
