import React, { useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import DataTable from "@/components/admin/data-table";
import queryString from "query-string";
import { getTagDashboard } from "@/api/api";
import { Tag } from "antd";

const TagsPage = () => {
  const tableRef = useRef();
  const formRef = useRef();
  const user = useAppSelector((state) => state.account.user);
  const isAdmin = user?.role === "ADMIN";

  const [tags, setTags] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [meta, setMeta] = React.useState({ page: 0, pageSize: 10, total: 0 });

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 60,
      align: "center",
      render: (text, record, index) => (
        <>{index + 1 + meta.page * meta.pageSize}</>
      ),
      hideInSearch: true,
    },
    {
      title: "Tag Name",
      dataIndex: "name",
      width: 350,
      sorter: true,
    },
    {
      title: "Total Questions",
      dataIndex: "questionCount",
      width: 100,
      align: "center",
      sorter: true,
      hideInSearch: true,
      render: (val) => val || 0,
    },
    {
      title: "Total Answers",
      dataIndex: "userAnswerCount",
      width: 100,
      align: "center",
      sorter: true,
      hideInSearch: true,
      render: (val) => val || 0,
    },
    {
      title: "Correction Rate",
      dataIndex: "correctRate",
      width: 100,
      align: "center",
      sorter: true,
      hideInSearch: true,
      render: (val) => {
        if (val === null || val === undefined) return "-";
        const rate = typeof val === "number" ? val : parseFloat(val);
        const percentage = (rate).toFixed(2);
        const color = rate >= 70 ? "green" : rate >= 50 ? "orange" : "red";
        return <Tag color={color}>{percentage}%</Tag>;
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
      q.tagName = clone.name;
    }

    let temp = queryString.stringify(q);

    let sortBy = "";
    let direction = "DESC";

    if (sort?.name) {
      sortBy = "name";
      direction = sort.name === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.questionCount) {
      sortBy = "totalQuestions";
      direction = sort.questionCount === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.userAnswerCount) {
      sortBy = "totalAnswers";
      direction = sort.userAnswerCount === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.correctRate) {
      sortBy = "correctionRate";
      direction = sort.correctRate === "ascend" ? "ASC" : "DESC";
    }

    if (!sortBy) {
      sortBy = "totalQuestions";
      direction = "DESC";
    }

    temp = `${temp}&sortBy=${sortBy}&direction=${direction}`;
    return temp;
  };

  return (
    <div>
      <DataTable
        actionRef={tableRef}
        formRef={formRef}
        headerTitle="Tags Dashboard"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={tags}
        request={async (params, sort) => {
          setLoading(true);
          try {
            const query = buildQuery(params, sort);
            const response = await getTagDashboard(query);
            const data = response?.data || {};
            setTags(data.result || []);
            setMeta({
              page: data.meta?.page || 0,
              pageSize: data.meta?.pageSize || 10,
              total: data.meta?.total || 0,
            });
          } catch (error) {
            console.error("Failed to fetch tags", error);
            setTags([]);
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
      />
    </div>
  );
};

export default TagsPage;
