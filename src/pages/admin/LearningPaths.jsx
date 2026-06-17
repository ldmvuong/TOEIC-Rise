import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Space, Table, Tag, Button, Breadcrumb, Card } from "antd";
import { PlusOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import useAdminLearningPath from "@/hooks/useAdminLearningPath";

import CreateLearningPathModal from "./components/admin/learning-path/CreateLearningPathModal";
import EditLearningPathModal from "./components/admin/learning-path/EditLearningPathModal";

export default function LearningPaths() {
  const {
    learningPath,
    loading: tableLoading,
    load,
    createAdminLearningPath,
    updateAdminLearningPath,
  } = useAdminLearningPath();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    load({ page: 1, size: 10 });
  }, []);

  const handleRefreshList = async () => {
    setCreateOpen(false);
    setEditOpen(false);
    await load({
      page: learningPath.meta.page,
      size: learningPath.meta.size,
    });
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug" },
    {
      title: "Test Type",
      dataIndex: "testType",
      key: "testType",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Link to={`/admin/learning-paths/${record.id}`}>
            <Button icon={<EyeOutlined />}>View</Button>
          </Link>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedRecord(record);
              setEditOpen(true); // Mở Edit Modal
            }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Breadcrumb style={{ marginBottom: "16px" }}>
        <Breadcrumb.Item>Admin</Breadcrumb.Item>
        <Breadcrumb.Item>Learning Paths</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title="Learning Paths"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)} // Mở Create Modal
          >
            Add learning path
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={learningPath.result}
          loading={tableLoading}
          rowKey="id"
          pagination={{
            current: learningPath.meta.page,
            pageSize: learningPath.meta.size,
            total: learningPath.meta.total,
            onChange: (page, pageSize) => load({ page, size: pageSize }),
          }}
        />
      </Card>

      {/* Component Tạo Mới */}
      <CreateLearningPathModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onSuccess={handleRefreshList}
        createAdminLearningPath={createAdminLearningPath}
      />

      {/* Component Chỉnh Sửa */}
      <EditLearningPathModal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onSuccess={handleRefreshList}
        updateAdminLearningPath={updateAdminLearningPath}
        initialValues={selectedRecord}
      />
    </div>
  );
}
