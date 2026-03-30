import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Empty,
  Image,
  Input,
  Pagination,
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
import { searchPublicBlogs } from "@/api/api";

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

const BlogSearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const keywordParam = (searchParams.get("keyword") || "").trim();

  const [keyword, setKeyword] = useState(keywordParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState({ page: 0, pageSize: 10, total: 0, pages: 0 });

  useEffect(() => {
    setKeyword(keywordParam);
  }, [keywordParam]);

  const fetchResults = useCallback(async () => {
    if (!keywordParam) {
      setPosts([]);
      setMeta((m) => ({ ...m, total: 0, pages: 0, page: 0 }));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await searchPublicBlogs({
        keyword: keywordParam,
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
      setError(e?.message || "Unable to search blog posts");
      setPosts([]);
      setMeta((m) => ({ ...m, total: 0, pages: 0 }));
    } finally {
      setLoading(false);
    }
  }, [keywordParam, meta.page, meta.pageSize]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const runSearch = () => {
    const next = keyword.trim();
    setMeta((m) => ({ ...m, page: 0 }));
    if (!next) {
      setSearchParams({});
      return;
    }
    setSearchParams({ keyword: next });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/blog")}>
            Back to blog
          </Button>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={runSearch}
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Search blogs with Elasticsearch keyword..."
              size="large"
            />
            <Button type="primary" size="large" onClick={runSearch}>
              Search
            </Button>
          </div>
        </Card>

        <div className="mb-4">
          <Title level={3} style={{ marginBottom: 4 }}>
            Search results
          </Title>
          <Text type="secondary">
            {keywordParam ? `Keyword: "${keywordParam}"` : "Enter a keyword to search."}
          </Text>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[32vh]">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <Text type="danger">{error}</Text>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <Empty description="No matching posts found" />
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => {
              const statusColor = STATUS_COLOR[p.status] ?? "default";
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
                        {p.status ? <Tag color={statusColor}>{p.status}</Tag> : null}
                        {p.categoryName ? <Tag color="blue">{p.categoryName}</Tag> : null}
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
    </div>
  );
};

export default BlogSearchPage;

