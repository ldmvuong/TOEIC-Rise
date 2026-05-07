import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Empty,
  Image,
  Input,
  Pagination,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  RightOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getPublicBlogCategories,
  getPublicBlogPostsByCategorySlug,
} from "@/api/api";

const { Title, Text } = Typography;

function formatUpdatedAt(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const d = dayjs(normalized);
  return d.isValid() ? d.format("MMM D, YYYY") : String(value);
}

const BlogPostsPage = () => {
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

  const viewMode = "category";

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
      if (!slug) {
        setPosts([]);
        setMeta((m) => ({ ...m, total: 0, pages: 0 }));
        setLoading(false);
        return;
      }
      const res = await getPublicBlogPostsByCategorySlug(slug, {
        title: appliedQ.trim(),
        page: meta.page,
        size: meta.pageSize,
      });
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
      setError(e?.message || "Không thể tải danh sách bài viết");
      setPosts([]);
      setMeta((m) => ({ ...m, total: 0, pages: 0 }));
    } finally {
      setLoading(false);
    }
  }, [appliedQ, meta.page, meta.pageSize, slug, viewMode]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/blog")}
            >
              Danh mục
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card
              className="rounded-2xl border-slate-200 shadow-sm mb-5 overflow-hidden"
              styles={{ body: { padding: 16 } }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="min-w-0">
                  <Title level={3} style={{ margin: 0 }}>
                    {activeCategory?.name || "Bài viết theo danh mục"}
                  </Title>
                  <Text type="secondary" className="text-sm">
                    Chọn bài viết để xem nội dung chi tiết.
                  </Text>
                </div>

                <div className="w-full lg:w-[420px]">
                  <Space.Compact className="w-full">
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onPressEnter={() => {
                        const keyword = q.trim();
                        if (!keyword) {
                          setMeta((m) => ({ ...m, page: 0 }));
                          setAppliedQ("");
                          return;
                        }
                        navigate(
                          `/blog/search?keyword=${encodeURIComponent(keyword)}`
                        );
                      }}
                      allowClear
                      size="large"
                      prefix={<SearchOutlined className="text-slate-400" />}
                      placeholder="Tìm bài viết theo tiêu đề"
                      className="rounded-xl"
                    />
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => {
                        const keyword = q.trim();
                        if (!keyword) {
                          setMeta((m) => ({ ...m, page: 0 }));
                          setAppliedQ("");
                          return;
                        }
                        navigate(
                          `/blog/search?keyword=${encodeURIComponent(keyword)}`
                        );
                      }}
                      disabled={!q.trim()}
                    >
                      Tìm
                    </Button>
                  </Space.Compact>
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
                <Empty description="Không có bài viết nào" />
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((p) => {
                  return (
                    <Card
                      key={p.id}
                      hoverable
                      className={`rounded-2xl border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-300 transition-all ${p?.slug ? "cursor-pointer" : ""}`}
                      styles={{ body: { padding: 16 } }}
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
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="sm:w-[210px] w-full">
                          {p.thumbnailUrl ? (
                            <div className="rounded-xl overflow-hidden bg-slate-100 relative">
                              <Image
                                src={p.thumbnailUrl}
                                alt=""
                                className="w-full object-cover"
                                style={{
                                  height: 120,
                                  width: "100%",
                                  objectFit: "cover",
                                  objectPosition: "center",
                                }}
                                preview={false}
                              />
                              <div className="absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
                                Nổi bật
                              </div>
                            </div>
                          ) : (
                            <div className="h-[120px] w-full rounded-xl bg-gradient-to-br from-slate-100 via-white to-indigo-50 border border-slate-200 relative">
                              <div className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
                                Nổi bật
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {p.categoryName ? (
                              <Tag color="blue" className="text-xs">
                                {p.categoryName}
                              </Tag>
                            ) : null}
                          </div>

                          <div className="text-lg font-semibold text-slate-900 line-clamp-2">
                            {p.title || "Chưa có tiêu đề"}
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
                                {Number(p.views).toLocaleString()} lượt xem
                              </span>
                            ) : null}
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
              className="rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-4 overflow-hidden"
              title={
                <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 px-4 py-3 rounded-t-2xl">
                  <div className="text-slate-900 font-semibold">Duyệt danh mục</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Chọn một chủ đề để xem các bài viết liên quan
                  </div>
                </div>
              }
              styles={{
                header: {
                  padding: 0,
                  borderBottom: "1px solid #e2e8f0",
                  overflow: "hidden",
                  borderRadius: "16px 16px 0 0",
                },
                title: { padding: 0 },
                body: { padding: 16 },
              }}
            >
              {categoriesLoading ? (
                <div className="py-6 flex justify-center">
                  <Spin />
                </div>
              ) : categories.length === 0 ? (
                <Empty description="Không có danh mục" />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="mt-1 text-xs text-slate-500">
                    {categories.filter((c) => (c?.isActive ?? true) === true).length}{" "}
                    danh mục
                  </div>
                  <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-2">
                    {categories
                      .filter((c) => (c?.isActive ?? true) === true)
                      .map((c) => {
                        const active = viewMode === "category" && c.slug === slug;
                        return (
                          <Button
                            key={c.id ?? c.slug}
                            onClick={() => navigate(`/blog/categories/${c.slug}`)}
                            className={`text-left w-full h-auto py-2.5 px-3 rounded-xl border transition-all ${
                              active
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm hover:!bg-indigo-600 hover:!text-white"
                                : "bg-white border-slate-200 text-slate-700 hover:!border-indigo-300 hover:!text-indigo-600 hover:!bg-indigo-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span className="truncate font-medium">{c.name}</span>
                              <RightOutlined
                                className={active ? "text-white/90 text-xs" : "text-slate-400 text-xs"}
                              />
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

