import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import {
  Button,
  Card,
  Input,
  Spin,
  Typography,
  Empty,
  Space,
  Pagination,
} from "antd";
import {
  BookOutlined,
  CalendarOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getPublicBlogCategories, getNewestPublicBlogPosts } from "@/api/api";
import BlogPostCard from "@/components/card/blog-post.card.jsx";

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
      <div className="max-w-6xl mx-auto px-4 py-7">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-4 md:p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Title level={2} style={{ marginBottom: 6 }}>
                Blog Categories
              </Title>
              <Text type="secondary" className="text-base">
                Explore TOEIC topics, study tips, and useful resources.
              </Text>
            </div>

            <div className="w-full md:w-[420px]">
              <Space.Compact className="w-full">
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
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    const keyword = q.trim();
                    if (!keyword) return;
                    navigate(`/blog/search?keyword=${encodeURIComponent(keyword)}`);
                  }}
                  disabled={!q.trim()}
                >
                  Search
                </Button>
              </Space.Compact>
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
          <Swiper
            modules={[FreeMode, Mousewheel]}
            spaceBetween={16}
            slidesPerView="auto"
            freeMode
            mousewheel={{ forceToAxis: true }}
            grabCursor
            className="!pb-2"
          >
            {categories.map((c) => (
              <SwiperSlide
                key={c.id ?? c.slug}
                className="!w-[230px] sm:!w-[260px] lg:!w-[280px]"
              >
                <Link
                  to={`/blog/categories/${c.slug}`}
                  className="no-underline block"
                >
                  <Card
                    hoverable
                    className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
                    styles={{ body: { padding: 14 } }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600 border border-indigo-100">
                          <BookOutlined />
                          Category
                        </div>
                        <div className="text-[15px] font-semibold text-slate-900 line-clamp-2">
                          {c?.name || "Untitled"}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <Title level={3} style={{ margin: 0 }}>
              Latest Posts
            </Title>
            <span className="text-xs text-slate-500">
              {newestMeta.total > 0
                ? `${newestMeta.total} posts`
                : "New content"}
            </span>
          </div>

          {newestLoading ? (
            <div className="flex items-center justify-center min-h-[160px]">
              <Spin />
            </div>
          ) : newestPosts.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <Empty description="No new posts yet" />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {newestPosts.map((p) => (
                  <BlogPostCard
                    key={p.id}
                    post={p}
                    showNewBadge
                    onClick={
                      p?.slug ? () => navigate(`/blog/posts/${p.slug}`) : undefined
                    }
                  />
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
