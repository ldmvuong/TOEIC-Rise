import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Spin,
  Tag,
  Typography,
  Empty,
  Image,
  Space,
  Pagination,
} from "antd";
import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  EyeOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getPublicBlogCategories, getNewestPublicBlogPosts } from "@/api/api";

const { Title, Text } = Typography;

function formatUpdatedAt(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const d = dayjs(normalized);
  return d.isValid() ? d.format("MMM D, YYYY") : String(value);
}

const BlogCategoriesPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [newestPosts, setNewestPosts] = useState([]);
  const [newestLoading, setNewestLoading] = useState(false);
  const [newestMeta, setNewestMeta] = useState({
    page: 0,
    pageSize: 6,
    total: 0,
    pages: 0,
  });
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getPublicBlogCategories();
        const data = res?.data ?? [];
        if (!mounted) return;
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Unable to load blog categories");
        setCategories([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setNewestLoading(true);
      try {
        const res = await getNewestPublicBlogPosts({
          page: newestMeta.page,
          size: newestMeta.pageSize,
        });
        const data = res?.data ?? {};
        if (!mounted) return;
        setNewestPosts(Array.isArray(data.result) ? data.result : []);
        setNewestMeta((prev) => ({
          ...prev,
          page: data.meta?.page ?? prev.page,
          pageSize: data.meta?.pageSize ?? prev.pageSize,
          total: data.meta?.total ?? 0,
          pages: data.meta?.pages ?? 0,
        }));
      } catch {
        if (!mounted) return;
        setNewestPosts([]);
        setNewestMeta((prev) => ({ ...prev, total: 0, pages: 0 }));
      } finally {
        if (mounted) setNewestLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [newestMeta.page, newestMeta.pageSize]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-5 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-indigo-600 border border-indigo-100 mb-3">
                <BookOutlined />
                Learning resources
              </div>
              <Title level={2} style={{ marginBottom: 6 }}>
                Blog categories
              </Title>
              <Text type="secondary" className="text-base">
                Explore TOEIC tips, strategies, and learning resources.
              </Text>
            </div>

            <div className="w-full md:w-[420px]">
              <Input
                allowClear
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onPressEnter={() => {
                  const keyword = q.trim();
                  if (!keyword) return;
                  navigate(`/blog/search?keyword=${encodeURIComponent(keyword)}`);
                }}
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Search posts by keyword"
                size="large"
                className="rounded-xl"
              />
              <div className="mt-2 flex justify-end">
                <Space>
                  <Button
                    type="default"
                    onClick={() => {
                      const keyword = q.trim();
                      if (!keyword) return;
                      navigate(`/blog/search?keyword=${encodeURIComponent(keyword)}`);
                    }}
                    disabled={!q.trim()}
                  >
                    Search posts
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <Text type="danger">{error}</Text>
          </Card>
        ) : categories.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <Empty description="No categories found" />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((c) => {
              const isActive = c?.isActive ?? true;
              return (
                <Link
                  key={c.id ?? c.slug}
                  to={`/blog/categories/${c.slug}`}
                  className="no-underline"
                >
                  <Card
                    hoverable
                    className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
                    styles={{ body: { padding: 18 } }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600 border border-indigo-100">
                          <BookOutlined />
                          Category
                        </div>
                        <div className="text-base font-semibold text-slate-900 line-clamp-2">
                          {c?.name || "Untitled category"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">
                        View posts
                      </span>
                      <ArrowRightOutlined className="text-indigo-400" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <Title level={3} style={{ margin: 0 }}>
              Newest posts
            </Title>
            <span className="text-xs text-slate-500">
              {newestMeta.total > 0 ? `${newestMeta.total} posts` : "Fresh content"}
            </span>
          </div>

          {newestLoading ? (
            <div className="flex items-center justify-center min-h-[160px]">
              <Spin />
            </div>
          ) : newestPosts.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <Empty description="No newest posts yet" />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {newestPosts.map((p) => (
                  <Card
                    key={p.id}
                    hoverable
                    className={`rounded-2xl border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${p?.slug ? "cursor-pointer" : ""}`}
                    styles={{ body: { padding: 14 } }}
                    onClick={() => {
                      if (p?.slug) navigate(`/blog/posts/${p.slug}`);
                    }}
                    onKeyDown={(e) => {
                      if (!p?.slug) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/blog/posts/${p.slug}`);
                      }
                    }}
                    role={p?.slug ? "link" : undefined}
                    tabIndex={p?.slug ? 0 : -1}
                  >
                    {p.thumbnailUrl ? (
                      <div className="rounded-xl overflow-hidden bg-slate-100 mb-3 relative">
                        <Image
                          src={p.thumbnailUrl}
                          alt=""
                          preview={false}
                          className="w-full object-cover"
                          style={{
                            height: 150,
                            width: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                          }}
                        />
                        <div className="absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
                          New
                        </div>
                      </div>
                    ) : (
                      <div className="h-[150px] rounded-xl bg-gradient-to-br from-slate-100 via-white to-indigo-50 border border-slate-200 mb-3 relative">
                        <div className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
                          New
                        </div>
                      </div>
                    )}

                    <div className="text-base font-semibold text-slate-900 line-clamp-2">
                      {p.title || "Untitled"}
                    </div>
                    {p.summary ? (
                      <div className="mt-1 text-sm text-slate-600 line-clamp-3">
                        {p.summary}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {p.authorName ? (
                        <span className="inline-flex items-center gap-1">
                          <UserOutlined />
                          {p.authorName}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <CalendarOutlined />
                        {formatUpdatedAt(p.updatedAt)}
                      </span>
                      {p.views != null ? (
                        <span className="inline-flex items-center gap-1">
                          <EyeOutlined />
                          {Number(p.views).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-600">
                        Read article
                      </span>
                      <ArrowRightOutlined className="text-indigo-400" />
                    </div>
                  </Card>
                ))}
              </div>
              {newestMeta.total > 0 ? (
                <div className="mt-6 flex justify-center">
                  <Pagination
                    current={newestMeta.page + 1}
                    pageSize={newestMeta.pageSize}
                    total={newestMeta.total}
                    showSizeChanger
                    pageSizeOptions={["3", "6", "9", "12"]}
                    onChange={(page, pageSize) => {
                      setNewestMeta((prev) => ({
                        ...prev,
                        page: page - 1,
                        pageSize,
                      }));
                    }}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogCategoriesPage;

