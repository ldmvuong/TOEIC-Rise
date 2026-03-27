import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import parse from "html-react-parser";
import { Button, Card, Image, Space, Spin, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getPublicBlogPostDetailBySlug } from "@/api/api";

const { Title, Text } = Typography;

function formatDate(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const d = dayjs(normalized);
  return d.isValid() ? d.format("MMM D, YYYY") : String(value);
}

function injectHeadingIdsAndToc(html) {
  if (!html || typeof html !== "string") return { html: html || "", items: [] };
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
      while (used.has(id)) id = `${base}-${++n}`;
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
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const BlogPostDetailPublicPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [post, setPost] = useState(null);

  const load = useCallback(async () => {
    if (!slug) {
      setError("Invalid post slug");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getPublicBlogPostDetailBySlug(slug);
      setPost(res?.data ?? null);
    } catch (e) {
      setPost(null);
      setError(e?.message || "Unable to load post");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const { contentHtml, tocItems } = useMemo(() => {
    const { html, items } = injectHeadingIdsAndToc(post?.content);
    return { contentHtml: html, tocItems: items };
  }, [post?.content]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <Text type="danger">{error || "Post not found"}</Text>
          <div className="mt-4">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Space wrap className="mb-5">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          {post.categorySlug ? (
            <Link to={`/blog/categories/${post.categorySlug}`}>
              <Button type="link">
                Category: {post.categoryName || post.categorySlug}
              </Button>
            </Link>
          ) : null}
        </Space>

        <Card
          className="rounded-2xl border-slate-200 shadow-sm overflow-hidden"
          styles={{ body: { padding: 0 } }}
        >
          {post.thumbnailUrl ? (
            <div className="bg-slate-100 max-h-[420px] overflow-hidden">
              <Image
                src={post.thumbnailUrl}
                alt=""
                className="w-full object-cover"
                style={{ width: "100%", maxHeight: 420, objectFit: "cover" }}
                preview
              />
            </div>
          ) : (
            <div className="h-[180px] bg-gradient-to-br from-slate-100 via-white to-indigo-50 border-b border-slate-200" />
          )}

          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-slate-600">
              {post.authorName ? (
                <span className="inline-flex items-center gap-1">
                  <UserOutlined />
                  {post.authorName}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <CalendarOutlined />
                {formatDate(post.updatedAt)}
              </span>
              {post.views != null ? (
                <span className="inline-flex items-center gap-1">
                  <EyeOutlined />
                  {Number(post.views).toLocaleString()} views
                </span>
              ) : null}
              {post.categoryName ? <Tag color="blue">{post.categoryName}</Tag> : null}
            </div>

            <Title level={2} style={{ marginBottom: 8 }}>
              {post.title || "Untitled"}
            </Title>
            {post.summary ? (
              <Text type="secondary" className="text-base block">
                {post.summary}
              </Text>
            ) : null}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-8">
            <Card
              className="rounded-2xl border-slate-200 shadow-sm"
              title="Article"
              styles={{ body: { padding: 18 } }}
            >
              <div
                className="blog-post-reader-content text-slate-800 leading-relaxed
                  [&_table]:border-collapse [&_table]:border [&_table]:border-slate-200 [&_table]:my-4
                  [&_td]:border [&_td]:border-slate-200 [&_td]:p-2
                  [&_th]:border [&_th]:border-slate-200 [&_th]:p-2 [&_th]:bg-slate-50
                  [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200
                  [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:scroll-mt-24
                  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:scroll-mt-24
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:scroll-mt-24
                  [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                  [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-300 [&_blockquote]:bg-indigo-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:rounded-r-xl
                  [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded"
              >
                {contentHtml ? parse(contentHtml) : <Text type="secondary">No content</Text>}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4">
            {tocItems.length > 0 ? (
              <Card
                className="rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-4"
                title="On this page"
                styles={{
                  body: { maxHeight: "min(70vh, 520px)", overflowY: "auto", padding: "12px 16px" },
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
            ) : (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <Text type="secondary">No headings found.</Text>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPostDetailPublicPage;

