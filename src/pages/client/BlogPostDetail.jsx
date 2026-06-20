import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Empty, Image, Space, Spin, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getPublicBlogPostDetailBySlug,
  getPublicRelatedBlogPosts,
} from "@/api/api";
import { renderBlogHtml } from "@/utils/blogContent.jsx";
import BlogPostCard from "@/components/card/blog-post.card.jsx";

const { Title, Text } = Typography;

function formatDate(value) {
  if (!value) return "—";
  const normalized =
    typeof value === "string" ? value.replace(" ", "T") : value;
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
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

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

  useEffect(() => {
    const postId = post?.id;
    if (!postId) {
      setRelatedPosts([]);
      return;
    }
    let mounted = true;
    const run = async () => {
      setRelatedLoading(true);
      try {
        const res = await getPublicRelatedBlogPosts(postId, 6);
        const data = res?.data;
        if (!mounted) return;
        setRelatedPosts(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setRelatedPosts([]);
      } finally {
        if (mounted) setRelatedLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [post?.id]);

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              className="rounded-xl"
            >
              Back
            </Button>
            {post.categorySlug ? (
              <Link to={`/blog/categories/${post.categorySlug}`}>
                <Tag color="blue" className="cursor-pointer m-0">
                  Category: {post.categoryName || post.categorySlug}
                </Tag>
              </Link>
            ) : null}
          </div>
        </div>

        <Card
          className="rounded-2xl border-slate-200 shadow-sm overflow-hidden"
          styles={{ body: { padding: 0 } }}
        >
          {post.thumbnailUrl ? (
            <div className="bg-slate-100 h-[200px] sm:h-[280px] lg:h-[340px]">
              <img
                src={post.thumbnailUrl}
                alt=""
                className="w-full h-full block"
                style={{ objectFit: "cover", objectPosition: "center" }}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-[180px] bg-gradient-to-br from-slate-100 via-white to-indigo-50 border-b border-slate-200" />
          )}

          <div className="p-6 md:p-8 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-slate-600">
              {post.authorName ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1">
                  <UserOutlined />
                  {post.authorName}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1">
                <CalendarOutlined />
                {formatDate(post.updatedAt)}
              </span>
              {post.views != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1">
                  <EyeOutlined />
                  {Number(post.views).toLocaleString()} views
                </span>
              ) : null}
              {post.categoryName ? (
                <Tag color="blue">{post.categoryName}</Tag>
              ) : null}
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
          <div className="lg:col-span-9 min-w-0">
            <Card
              className="rounded-2xl border-slate-200 shadow-sm overflow-hidden"
              title={
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Content</span>
                  <span className="text-xs text-slate-500">
                    {tocItems.length > 0
                      ? `${tocItems.length} sections`
                      : "Reading mode"}
                  </span>
                </div>
              }
              styles={{ body: { padding: 18 } }}
            >
              <div
                className="blog-post-reader-content text-slate-800 leading-relaxed min-w-0
                  [&_table]:w-full [&_table]:max-w-full [&_table]:table-auto
                  [&_table]:border-collapse [&_table]:border [&_table]:border-slate-200 [&_table]:my-4
                  [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_td]:break-words [&_td]:text-left [&_td]:align-middle
                  [&_th]:border [&_th]:border-slate-200 [&_th]:p-2 [&_th]:bg-slate-50 [&_th]:break-words [&_th]:text-left [&_th]:align-middle
                  [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200
                  [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:scroll-mt-24
                  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:scroll-mt-24
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:scroll-mt-24
                  [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                  [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-300 [&_blockquote]:bg-indigo-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:rounded-r-xl
                  [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded"
              >
                {contentHtml ? (
                  renderBlogHtml(contentHtml)
                ) : (
                  <Text type="secondary">No content</Text>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {tocItems.length > 0 ? (
              <Card
                className="rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-4 overflow-hidden"
                title="Table of contents"
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
            ) : (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <Text type="secondary">No table of contents found.</Text>
              </Card>
            )}
          </div>
        </div>

        <Card
          className="rounded-2xl border-slate-200 shadow-sm mt-6 overflow-hidden"
          title={
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 px-4 py-3">
              <div className="text-slate-900 font-semibold">Related Posts</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Similar content suggestions for your next read
              </div>
            </div>
          }
          styles={{
            header: {
              padding: 0,
              borderBottom: "1px solid #e2e8f0",
            },
            title: { padding: 0 },
            body: { padding: 16 },
          }}
        >
          {relatedLoading ? (
            <div className="py-8 flex justify-center">
              <Spin />
            </div>
          ) : relatedPosts.length === 0 ? (
            <Empty description="No related posts" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <BlogPostCard
                  key={rp.id}
                  post={rp}
                  showNewBadge={false}
                  onClick={
                    rp?.slug
                      ? () => navigate(`/blog/posts/${rp.slug}`)
                      : undefined
                  }
                  bodyPadding={12}
                  imageHeight={130}
                  className="rounded-xl hover:border-indigo-300"
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BlogPostDetailPublicPage;
