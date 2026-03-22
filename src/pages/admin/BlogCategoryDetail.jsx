import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Descriptions,
  Image,
  Space,
  Tag,
} from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import queryString from "query-string";
import DataTable from "@/components/admin/data-table";
import {
  getBlogCategoryById,
  getBlogPostsByCategorySlug,
} from "@/api/api";
import ModalUpdateBlogCategory from "@/components/admin/blog-category/update.blog-category.jsx";

/** Match backend EBlogPostStatus names; extend if your enum differs */
const BLOG_POST_STATUS_ENUM = {
  DRAFT: { text: "Draft" },
  PUBLISHED: { text: "Published" },
  SCHEDULED: { text: "Scheduled" },
  ARCHIVED: { text: "Archived" },
};

const BlogCategoryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const postsTableRef = useRef();
  const postsFormRef = useRef();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(null);

  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsMeta, setPostsMeta] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

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

  const reloadDetail = useCallback(async () => {
    await fetchCategory(true);
    postsTableRef.current?.reload();
  }, [fetchCategory]);

  const buildPostsQuery = (params, sort) => {
    const clone = { ...params };
    const q = {
      page: clone.current - 1,
      size: clone.pageSize,
    };

    if (clone.title) q.title = clone.title;
    if (clone.slug) q.slug = clone.slug;
    if (clone.status) q.status = clone.status;

    let temp = queryString.stringify(q);

    let sortBy = "updatedAt";
    let direction = "DESC";

    if (sort?.title) {
      sortBy = "title";
      direction = sort.title === "ascend" ? "ASC" : "DESC";
    } else if (sort?.slug) {
      sortBy = "slug";
      direction = sort.slug === "ascend" ? "ASC" : "DESC";
    } else if (sort?.views) {
      sortBy = "views";
      direction = sort.views === "ascend" ? "ASC" : "DESC";
    } else if (sort?.updatedAt) {
      sortBy = "updatedAt";
      direction = sort.updatedAt === "ascend" ? "ASC" : "DESC";
    }

    temp = `${temp}&sortBy=${sortBy}&direction=${direction}`;
    return temp;
  };

  const postColumns = [
    {
      title: "No.",
      key: "index",
      width: 60,
      align: "center",
      render: (_t, _r, index) => (
        <>{index + 1 + postsMeta.page * postsMeta.pageSize}</>
      ),
      hideInSearch: true,
    },
    {
      title: "Title",
      dataIndex: "title",
      ellipsis: true,
      sorter: true,
    },
    {
      title: "Slug",
      dataIndex: "slug",
      ellipsis: true,
      sorter: true,
    },
    {
      title: "Summary",
      dataIndex: "summary",
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: "Thumbnail",
      dataIndex: "thumbnailUrl",
      hideInSearch: true,
      width: 90,
      align: "center",
      render: (url) =>
        url ? (
          <Image
            src={url}
            alt=""
            width={56}
            height={56}
            style={{ objectFit: "cover", borderRadius: 4 }}
            preview
          />
        ) : (
          "—"
        ),
    },
    {
      title: "Author",
      dataIndex: "authorName",
      width: 140,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: "Views",
      dataIndex: "views",
      width: 90,
      align: "center",
      sorter: true,
      hideInSearch: true,
      render: (v) => (v != null ? v : "—"),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      width: 170,
      sorter: true,
      hideInSearch: true,
      render: (text) =>
        text ? dayjs(text).format("DD-MM-YYYY HH:mm:ss") : "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      hideInTable: true,
      valueType: "select",
      valueEnum: BLOG_POST_STATUS_ENUM,
      fieldProps: {
        allowClear: true,
        placeholder: "All",
      },
    },
  ];

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

        <DataTable
          key={category.slug}
          actionRef={postsTableRef}
          formRef={postsFormRef}
          headerTitle="Posts in this category"
          rowKey="id"
          loading={postsLoading}
          columns={postColumns}
          dataSource={posts}
          request={async (params, sort) => {
            if (!category.slug) {
              setPosts([]);
              setPostsMeta({ page: 0, pageSize: 10, total: 0 });
              return;
            }
            setPostsLoading(true);
            try {
              const query = buildPostsQuery(params, sort);
              const response = await getBlogPostsByCategorySlug(
                category.slug,
                query,
              );
              const data = response?.data || {};
              setPosts(data.result || []);
              setPostsMeta({
                page: data.meta?.page ?? 0,
                pageSize: data.meta?.pageSize ?? 10,
                total: data.meta?.total ?? 0,
              });
            } catch (err) {
              console.error("Failed to fetch blog posts", err);
              setPosts([]);
              setPostsMeta({ page: 0, pageSize: 10, total: 0 });
            } finally {
              setPostsLoading(false);
            }
          }}
          pagination={{
            current: postsMeta.page + 1,
            pageSize: postsMeta.pageSize,
            total: postsMeta.total,
            showSizeChanger: true,
            showTotal: (total, range) => (
              <div>
                {range[0]}-{range[1]} of {total} rows
              </div>
            ),
          }}
          scroll={{ x: true }}
          rowSelection={false}
        />
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
