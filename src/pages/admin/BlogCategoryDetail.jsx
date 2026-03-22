import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Image,
  Input,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import queryString from "query-string";
import {
  getBlogCategoryById,
  getBlogPostsByCategorySlug,
} from "@/api/api";
import ModalUpdateBlogCategory from "@/components/admin/blog-category/update.blog-category.jsx";

const { Text, Title } = Typography;

/** Match backend EBlogPostStatus */
const BLOG_POST_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: "updatedAt_DESC", label: "Newest first" },
  { value: "updatedAt_ASC", label: "Oldest first" },
  { value: "title_ASC", label: "Title A–Z" },
  { value: "title_DESC", label: "Title Z–A" },
  { value: "views_DESC", label: "Most views" },
  { value: "views_ASC", label: "Fewest views" },
];

function parseSortOption(value) {
  const i = value.lastIndexOf("_");
  return {
    sortBy: value.slice(0, i),
    direction: value.slice(i + 1),
  };
}

const BlogCategoryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(null);

  const [openUpdateModal, setOpenUpdateModal] = useState(false);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftSlug, setDraftSlug] = useState("");
  const [draftStatus, setDraftStatus] = useState(undefined);

  const [appliedTitle, setAppliedTitle] = useState("");
  const [appliedSlug, setAppliedSlug] = useState("");
  const [appliedStatus, setAppliedStatus] = useState(undefined);

  const [sortOption, setSortOption] = useState("updatedAt_DESC");
  /** Bumps after category save so posts refetch even when slug is unchanged */
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  const fetchCategory = useCallback(async (silent = false) => {
    if (!id) {
      setCategory(null);
      setError("Invalid category id");
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const res = await getBlogCategoryById(id);
      setCategory(res?.data ?? null);
    } catch (e) {
      setCategory(null);
      setError(e?.message || "Unable to load category");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchCategory(false);
  }, [fetchCategory]);

  const loadPosts = useCallback(async () => {
    if (!category?.slug) {
      setPosts([]);
      setTotal(0);
      return;
    }
    setPostsLoading(true);
    try {
      const { sortBy, direction } = parseSortOption(sortOption);
      const q = {
        page,
        size: pageSize,
        sortBy,
        direction,
      };
      if (appliedTitle.trim()) q.title = appliedTitle.trim();
      if (appliedSlug.trim()) q.slug = appliedSlug.trim();
      if (appliedStatus) q.status = appliedStatus;

      const query = queryString.stringify(q);
      const response = await getBlogPostsByCategorySlug(category.slug, query);
      const data = response?.data || {};
      setPosts(data.result || []);
      setTotal(data.meta?.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch blog posts", err);
      setPosts([]);
      setTotal(0);
    } finally {
      setPostsLoading(false);
    }
  }, [
    category?.slug,
    page,
    pageSize,
    appliedTitle,
    appliedSlug,
    appliedStatus,
    sortOption,
    postsRefreshKey,
  ]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const reloadDetail = useCallback(async () => {
    await fetchCategory(true);
    setPostsRefreshKey((k) => k + 1);
  }, [fetchCategory]);

  const prevCategorySlugRef = useRef(undefined);
  useEffect(() => {
    if (!category?.slug) return;
    if (
      prevCategorySlugRef.current !== undefined &&
      prevCategorySlugRef.current !== category.slug
    ) {
      setPage(0);
    }
    prevCategorySlugRef.current = category.slug;
  }, [category?.slug]);

  const handleSearch = () => {
    setAppliedTitle(draftTitle);
    setAppliedSlug(draftSlug);
    setAppliedStatus(draftStatus);
    setPage(0);
  };

  const handleResetFilters = () => {
    setDraftTitle("");
    setDraftSlug("");
    setDraftStatus(undefined);
    setAppliedTitle("");
    setAppliedSlug("");
    setAppliedStatus(undefined);
    setPage(0);
  };

  if (loading && !category && !error) {
    return (
      <div className="p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 mb-3">{error}</div>
        <Button onClick={() => navigate("/admin/blog-categories")}>
          Back to categories
        </Button>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-4">
        <p>Category not found.</p>
        <Button onClick={() => navigate("/admin/blog-categories")}>
          Back to categories
        </Button>
      </div>
    );
  }

  const active = category.isActive ?? category.active;

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space wrap>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/admin/blog-categories")}
          >
            Back
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setOpenUpdateModal(true)}
          >
            Edit category
          </Button>
        </Space>

        <Card title="Category detail">
          <Descriptions column={{ xs: 1, sm: 1, md: 2 }} bordered size="small">
            <Descriptions.Item label="Name">{category.name}</Descriptions.Item>
            <Descriptions.Item label="Slug">
              <code>{category.slug}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {active == null ? (
                "—"
              ) : (
                <Tag color={active ? "green" : "default"}>
                  {active ? "Active" : "Inactive"}
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {category.createdAt
                ? dayjs(category.createdAt).format("DD-MM-YYYY HH:mm:ss")
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Updated" span={2}>
              {category.updatedAt
                ? dayjs(category.updatedAt).format("DD-MM-YYYY HH:mm:ss")
                : "—"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <Title level={4} style={{ margin: 0 }}>
              Posts in this category
            </Title>
            <Select
              value={sortOption}
              onChange={(v) => {
                setSortOption(v);
                setPage(0);
              }}
              options={SORT_OPTIONS}
              style={{ minWidth: 180 }}
              aria-label="Sort posts"
            />
          </div>

          <Card
            size="small"
            className="mb-4 bg-slate-50/80 border-slate-200/80"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  allowClear
                  placeholder="Filter by title"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Input
                  allowClear
                  placeholder="Filter by slug"
                  value={draftSlug}
                  onChange={(e) => setDraftSlug(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  allowClear
                  placeholder="Status"
                  className="w-full"
                  value={draftStatus}
                  onChange={setDraftStatus}
                  options={BLOG_POST_STATUS_OPTIONS}
                />
              </Col>
              <Col xs={24}>
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleSearch}
                  >
                    Search
                  </Button>
                  <Button onClick={handleResetFilters}>Reset</Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Spin spinning={postsLoading}>
            {posts.length === 0 && !postsLoading ? (
              <Empty
                description="No posts in this category"
                className="py-12"
              />
            ) : (
              <Row gutter={[20, 20]}>
                {posts.map((post) => (
                  <Col xs={24} sm={12} xl={8} key={post.id}>
                    <Card
                      hoverable
                      className="h-full overflow-hidden rounded-xl border-slate-200/90 shadow-sm hover:shadow-md transition-shadow duration-200"
                      styles={{
                        body: {
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                        },
                      }}
                      cover={
                        post.thumbnailUrl ? (
                          <div className="h-44 w-full overflow-hidden bg-slate-100">
                            <Image
                              alt=""
                              src={post.thumbnailUrl}
                              className="object-cover"
                              style={{
                                height: 176,
                                width: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                              preview={{ mask: "Preview" }}
                            />
                          </div>
                        ) : (
                          <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/80 text-slate-400">
                            <FileTextOutlined style={{ fontSize: 48 }} />
                          </div>
                        )
                      }
                    >
                      <div className="flex flex-1 flex-col p-4 pt-3">
                        <Title
                          level={5}
                          className="!mb-2 !mt-0 line-clamp-2 min-h-[2.75rem] text-slate-900"
                          style={{ fontSize: 16, lineHeight: 1.4 }}
                        >
                          {post.title || "Untitled"}
                        </Title>
                        {post.summary ? (
                          <Text
                            type="secondary"
                            className="line-clamp-3 text-sm leading-relaxed mb-3"
                          >
                            {post.summary}
                          </Text>
                        ) : (
                          <div className="mb-3 flex-1" />
                        )}
                        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 border-0 border-t border-solid border-slate-100 pt-3 text-xs text-slate-500">
                          {post.authorName ? (
                            <span className="inline-flex items-center gap-1">
                              <UserOutlined />
                              {post.authorName}
                            </span>
                          ) : null}
                          {post.updatedAt ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarOutlined />
                              {dayjs(post.updatedAt).format("MMM D, YYYY")}
                            </span>
                          ) : null}
                          {post.views != null ? (
                            <span className="inline-flex items-center gap-1">
                              <EyeOutlined />
                              {post.views.toLocaleString()} views
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Spin>

          {total > 0 ? (
            <div className="mt-8 flex justify-center">
              <Pagination
                current={page + 1}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                pageSizeOptions={["6", "10", "12", "24"]}
                showTotal={(t, range) =>
                  `${range[0]}–${range[1]} of ${t} posts`
                }
                onChange={(p, ps) => {
                  setPage(p - 1);
                  setPageSize(ps);
                }}
              />
            </div>
          ) : null}
        </div>
      </Space>

      <ModalUpdateBlogCategory
        openModal={openUpdateModal}
        setOpenModal={setOpenUpdateModal}
        reloadTable={reloadDetail}
        categoryData={category}
      />
    </div>
  );
};

export default BlogCategoryDetailPage;
