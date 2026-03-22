import React, { useRef, useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import DataTable from "@/components/admin/data-table";
import queryString from "query-string";
import { getAllBlogCategories } from "@/api/api";
import ModalCreateBlogCategory from "@/components/admin/blog-category/create.blog-category.jsx";

const BlogCategoriesPage = () => {
  const tableRef = useRef();
  const formRef = useRef();

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ page: 0, pageSize: 10, total: 0 });

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 70,
      align: "center",
      render: (_text, _record, index) => (
        <>{index + 1 + meta.page * meta.pageSize}</>
      ),
      hideInSearch: true,
    },
    {
      title: "Name",
      dataIndex: "name",
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
      title: "Active",
      dataIndex: "isActive",
      hideInTable: true,
      valueType: "select",
      valueEnum: {
        true: { text: "Active" },
        false: { text: "Inactive" },
      },
      fieldProps: {
        allowClear: true,
        placeholder: "All",
      },
    },
  ];

  const buildQuery = (params, sort) => {
    const clone = { ...params };
    const q = {
      page: clone.current - 1,
      size: clone.pageSize,
    };

    if (clone.name) {
      q.name = clone.name;
    }
    if (clone.slug) {
      q.slug = clone.slug;
    }

    const rawActive = clone.isActive;
    if (rawActive !== undefined && rawActive !== null && rawActive !== "") {
      if (rawActive === true || rawActive === "true") {
        q.isActive = true;
      } else if (rawActive === false || rawActive === "false") {
        q.isActive = false;
      }
    }

    let temp = queryString.stringify(q);

    let sortBy = "updatedAt";
    let direction = "DESC";

    if (sort?.name) {
      sortBy = "name";
      direction = sort.name === "ascend" ? "ASC" : "DESC";
    } else if (sort?.slug) {
      sortBy = "slug";
      direction = sort.slug === "ascend" ? "ASC" : "DESC";
    }

    temp = `${temp}&sortBy=${sortBy}&direction=${direction}`;
    return temp;
  };

  const reloadTable = () => {
    tableRef.current?.reload();
  };

  return (
    <div>
      <DataTable
        actionRef={tableRef}
        formRef={formRef}
        headerTitle="Blog categories"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={categories}
        request={async (params, sort) => {
          setLoading(true);
          try {
            const query = buildQuery(params, sort);
            const response = await getAllBlogCategories(query);
            const data = response?.data || {};
            setCategories(data.result || []);
            setMeta({
              page: data.meta?.page ?? 0,
              pageSize: data.meta?.pageSize ?? 10,
              total: data.meta?.total ?? 0,
            });
          } catch (error) {
            console.error("Failed to fetch blog categories", error);
            setCategories([]);
            setMeta({ page: 0, pageSize: 10, total: 0 });
          } finally {
            setLoading(false);
          }
        }}
        pagination={{
          current: meta.page + 1,
          pageSize: meta.pageSize,
          total: meta.total,
          showSizeChanger: true,
          showTotal: (total, range) => (
            <div>
              {range[0]}-{range[1]} of {total} rows
            </div>
          ),
        }}
        scroll={{ x: true }}
        rowSelection={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpenCreateModal(true)}
          >
            Create category
          </Button>,
        ]}
      />
      <ModalCreateBlogCategory
        openModal={openCreateModal}
        setOpenModal={setOpenCreateModal}
        reloadTable={reloadTable}
      />
    </div>
  );
};

export default BlogCategoriesPage;
