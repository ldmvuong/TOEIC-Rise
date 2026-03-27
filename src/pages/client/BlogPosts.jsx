import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Empty,
  Image,
  Input,
  Pagination,
  Segmented,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getNewestPublicBlogPosts,
  getPublicBlogCategories,
  getPublicBlogPostsByCategorySlug,
} from "@/api/api";

const { Title, Text } = Typography;

const STATUS_COLOR = {
  DRAFT: "default",
  PUBLISHED: "green",
  ARCHIVED: "orange",
};

function formatUpdatedAt(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const d = dayjs(normalized);
  return d.isValid() ? d.format("MMM D, YYYY") : String(value);
}

const BlogPostsPage = ({ mode }) => {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState({ page: 0, pageSize: 10, total: 0, pages: 0 });

  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  const viewMode = mode === "category" ? "category" : "newest";

  const activeCategory = useMemo(() => {
    if (viewMode !== "category") return null;
    const s = String(slug || "");
    return categories.find((c) => c.slug === s) || null;
  }, [categories, slug, viewMode]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await getPublicBlogCategories();
      const data = res?.data ?? [];
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (viewMode === "newest") {
        res = await getNewestPublicBlogPosts({
          title: appliedQ.trim(),
          page: meta.page,
          size: meta.pageSize,
        });
      } else {
        if (!slug) {
          setPosts([]);
          setMeta((m) => ({ ...m, total: 0, pages: 0 }));
          setLoading(false);
          return;
        }
        res = await getPublicBlogPostsByCategorySlug(slug, {
          title: appliedQ.trim(),
          page: meta.page,
          size: meta.pageSize,
        });
      }
      const data = res?.data ?? {};
      setPosts(Array.isArray(data.result) ? data.result : []);
      setMeta((m) => ({
        ...m,
        total: data.meta?.total ?? 0,
        pages: data.meta?.pages ?? 0,
        page: data.meta?.page ?? m.page,
        pageSize: data.meta?.pageSize ?? m.pageSize,
      }));
    } catch (e) {
      setError(e?.message || "Unable to load blog posts");
      setPosts([]);
      setMeta((m) => ({ ...m, total: 0, pages: 0 }));
    } finally {
      setLoading(false);
    }
  }, [appliedQ, meta.page, meta.pageSize, slug, viewMode]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const segmentedValue = viewMode === "newest" ? "Newest" : "By category";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/blog/categories")}
            >
              Categories
            </Button>
          </div>
          <Segmented
            value={segmentedValue}
            options={["Newest", "By category"]}
            onChange={(val) => {
              const next = val === "Newest" ? "/blog/newest" : "/blog/categories";
              navigate(next);
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="mb-5">
              <Title level={2} style={{ marginBottom: 6 }}>
                {viewMode === "newest"
                  ? "Newest posts"
                  : activeCategory?.name || "Category posts"}
              </Title>
              <Text type="secondary" className="text-base">
                {viewMode === "newest"
                  ? "Fresh TOEIC content from our team."
                  : activeCategory
                    ? `Category: ${activeCategory.slug}`
                    : `Category: ${slug}`}
              </Text>
            </div>

            <Card
              className="rounded-2xl border-slate-200 shadow-sm mb-5"
              styles={{ body: { padding: 16 } }}
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onPressEnter={() => {
                    setMeta((m) => ({ ...m, page: 0 }));
                    setAppliedQ(q);
                  }}
                  allowClear
                  size="large"
                  prefix={<SearchOutlined className="text-slate-400" />}
                  placeholder="Search posts by title"
                  className="rounded-xl"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="large"
                    onClick={() => {
                      setQ("");
                      setAppliedQ("");
                      setMeta((m) => ({ ...m, page: 0 }));
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => {
                      setMeta((m) => ({ ...m, page: 0 }));
                      setAppliedQ(q);
                    }}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <Spin size="large" />
              </div>
            ) : error ? (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <Text type="danger">{error}</Text>
              </Card>
            ) : posts.length === 0 ? (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <Empty description="No posts found" />
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((p) => {
                  const status = p.status;
                  const statusColor = STATUS_COLOR[status] ?? "default";
                  return (
                    <Card
                      key={p.id}
                      hoverable
                      className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                      styles={{ body: { padding: 16 } }}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="sm:w-[210px] w-full">
                          {p.thumbnailUrl ? (
                            <div className="rounded-xl overflow-hidden bg-slate-100">
                              <Image
                                src={p.thumbnailUrl}
                                alt=""
                                className="w-full object-cover"
                                style={{ height: 120, width: "100%", objectFit: "cover" }}
                                preview={false}
                              />
                            </div>
                          ) : (
                            <div className="h-[120px] w-full rounded-xl bg-gradient-to-br from-slate-100 via-white to-indigo-50 border border-slate-200" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {status ? (
                              <Tag color={statusColor} className="text-xs">
                                {status}
                              </Tag>
                            ) : null}
                            {p.categoryName ? (
                              <Tag color="blue" className="text-xs">
                                {p.categoryName}
                              </Tag>
                            ) : null}
                          </div>

                          <div className="text-lg font-semibold text-slate-900 line-clamp-2">
                            {p.title || "Untitled"}
                          </div>
                          {p.summary ? (
                            <div className="mt-1 text-sm text-slate-600 line-clamp-3">
                              {p.summary}
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
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
                                {Number(p.views).toLocaleString()} views
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 flex justify-end">
                            {p?.slug ? (
                              <Link to={`/blog/posts/${p.slug}`}>
                                <Button type="primary">Read</Button>
                              </Link>
                            ) : (
                              <Button disabled>Read</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {meta.total > 0 ? (
              <div className="mt-6 flex justify-center">
                <Pagination
                  current={meta.page + 1}
                  pageSize={meta.pageSize}
                  total={meta.total}
                  showSizeChanger
                  pageSizeOptions={["6", "10", "12", "24"]}
                  onChange={(page, pageSize) => {
                    setMeta((m) => ({ ...m, page: page - 1, pageSize }));
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-4">
            <Card
              className="rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-4"
              title="Browse categories"
              styles={{ body: { padding: 16 } }}
            >
              {categoriesLoading ? (
                <div className="py-6 flex justify-center">
                  <Spin />
                </div>
              ) : categories.length === 0 ? (
                <Empty description="No categories" />
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type={viewMode === "newest" ? "primary" : "default"}
                    onClick={() => navigate("/blog/newest")}
                    className="text-left"
                  >
                    Newest posts
                  </Button>
                  <div className="mt-2 text-xs text-slate-500">
                    Categories
                  </div>
                  <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-2">
                    {categories
                      .filter((c) => (c?.isActive ?? true) === true)
                      .map((c) => {
                        const active = viewMode === "category" && c.slug === slug;
                        return (
                          <Button
                            key={c.id ?? c.slug}
                            type={active ? "primary" : "default"}
                            onClick={() => navigate(`/blog/categories/${c.slug}`)}
                            className="text-left w-full"
                          >
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span className="truncate">{c.name}</span>
                              <span className="text-xs text-slate-400">
                                {c.slug}
                              </span>
                            </div>
                          </Button>
                        );
                      })}
                  </div>
                </div>
              )}
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPostsPage;

