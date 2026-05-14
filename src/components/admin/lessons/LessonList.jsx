import { memo, useCallback, useMemo } from "react";
import { Button, Card, Popconfirm, Space, Table, Tag, Typography } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
const { Title, Text } = Typography;
function LessonList({ data, loading, meta, onRefresh, onEdit, onDelete }) {
  const columns = useMemo(
    () => [
      {
        title: "Title",
        dataIndex: "title",
        key: "title",
        ellipsis: true,
        render: (v) => <Text strong>{v}</Text>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (v) => {
          const color =
            v === "PUBLISHED" ? "green" : v === "ARCHIVED" ? "volcano" : "gold";
          return <Tag color={color}>{v || "DRAFT"}</Tag>;
        },
      },
      {
        title: "Updated",
        dataIndex: "updatedAt",
        key: "updatedAt",
        width: 180,
        render: (v) => (v ? dayjs(v).format("DD-MM-YYYY HH:mm") : "-"),
      },
      {
        title: "Actions",
        key: "actions",
        width: 140,
        render: (_, row) => (
          <Space>
            {" "}
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit?.(row)}
            >
              {" "}
              Edit{" "}
            </Button>{" "}
            <Popconfirm
              title="Delete lesson?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => onDelete?.(row)}
            >
              {" "}
              <Button size="small" danger icon={<DeleteOutlined />} />{" "}
            </Popconfirm>{" "}
          </Space>
        ),
      },
    ],
    [onDelete, onEdit],
  );
  const pagination = useMemo(() => {
    const total = meta?.total ?? 0;
    const current = (meta?.page ?? 0) + 1;
    const pageSize = meta?.size ?? 10;
    return {
      total,
      current,
      pageSize,
      showSizeChanger: true,
      showTotal: (t, range) => (
        <div>
          {" "}
          {range[0]}-{range[1]} of {t} rows{" "}
        </div>
      ),
    };
  }, [meta?.page, meta?.size, meta?.total]);
  const handleTableChange = useCallback(
    (p) => {
      onRefresh?.({ page: (p?.current ?? 1) - 1, size: p?.pageSize ?? 10 });
    },
    [onRefresh],
  );
  return (
    <Card
      variant="outlined"
      style={{ borderRadius: 12 }}
      title={
        <div className="flex items-center justify-between">
          {" "}
          <Title level={5} style={{ margin: 0 }}>
            {" "}
            Lessons{" "}
          </Title>{" "}
          <Button
            icon={<ReloadOutlined />}
            onClick={() =>
              onRefresh?.({ page: meta?.page ?? 0, size: meta?.size ?? 10 })
            }
            disabled={loading}
          >
            {" "}
            Refresh{" "}
          </Button>{" "}
        </div>
      }
    >
      {" "}
      <Table
        rowKey={(row) => row.id}
        columns={columns}
        dataSource={Array.isArray(data) ? data : []}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: true }}
      />{" "}
    </Card>
  );
}
export default memo(LessonList);
