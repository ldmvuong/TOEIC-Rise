import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Space,
  Table,
  Tag,
  Button,
  Input,
  Card,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import useAdminLearningPath from "@/hooks/useAdminLearningPath";

import { createAdminLearningPath, updateAdminLearningPath } from "@/api/api";

import CreateLearningPathModal from "../../components/admin/learning-path/CreateLearningPathModal";
import EditLearningPathModal from "../../components/admin/learning-path/EditLearningPathModal";

const { Title, Text } = Typography;

export default function LearningPaths() {
  const learningPath = useAdminLearningPath();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const debounceRef = useRef(null);

  const load = useCallback(
    async (params = {}) => {
      try {
        await learningPath.fetchLearningPaths({
          name: params.name ?? (name || undefined),
          page: params.page ?? learningPath?.meta?.page ?? 0,
          size: params.size ?? learningPath?.meta?.size ?? 10,
          sortBy: params.sortBy ?? "updatedAt",
          direction: params.direction ?? "DESC",
        });
      } catch (e) {
        message.error(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load learning paths",
        );
      }
    },
    [learningPath, name],
  );

  useEffect(() => {
    load({ page: 0, size: 10 });
  }, []);

  const handleRefreshList = async () => {
    setCreateOpen(false);
    setEditOpen(false);
    await load({
      page: learningPath?.meta?.page ?? 0,
      size: learningPath?.meta?.size ?? 10,
    });
  };

  const onSearchChange = useCallback(
    (e) => {
      const next = e.target.value;
      setName(next);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        load({ page: 0, name: next || undefined });
      }, 350);
    },
    [load],
  );

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
      align: "center",
      render: (v) => <Text code>{v}</Text>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 320,
      render: (v, row) => (
        <div className="truncate text-base font-semibold text-slate-900">
          {v || `Learning Path #${row?.id ?? ""}`}
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (v) =>
        v ? (
          <div className="line-clamp-3 text-slate-700">{v}</div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Lessons",
      dataIndex: "lessonCount",
      key: "lessonCount",
      width: 110,
      align: "center",
      render: (v) => <Text strong>{Number(v || 0)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      align: "center",
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"} style={{ marginInlineEnd: 0 }}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 110,
      align: "center",
      render: (_, record) => (
        <Space size={2}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() =>
              record?.slug && navigate(`/admin/learning-paths/${record.slug}`)
            }
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedRecord(record);
              setEditOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const pagination = useMemo(() => {
    const total = learningPath?.meta?.total ?? 0;
    const current = (learningPath?.meta?.page ?? 0) + 1;
    const pageSize = learningPath?.meta?.size ?? 10;
    return {
      total,
      current,
      pageSize,
      showSizeChanger: true,
      showTotal: (t, range) => (
        <div>
          {range[0]}-{range[1]} of {t} rows
        </div>
      ),
    };
  }, [learningPath?.meta]);

  return (
    <div style={{ padding: 16 }}>
      <Card
        style={{ borderRadius: 12 }}
        title={
          <div className="flex items-center justify-between gap-4">
            <Title level={5} style={{ margin: 0 }}>
              Learning Paths
            </Title>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateOpen(true)}
              >
                Add learning path
              </Button>
              <Input
                allowClear
                placeholder="Search by name"
                prefix={<SearchOutlined />}
                value={name}
                onChange={onSearchChange}
                style={{ width: 280 }}
              />
              <ReloadOutlined
                style={{ fontSize: 18, cursor: "pointer" }}
                onClick={() =>
                  load({
                    page: learningPath?.meta?.page,
                    size: learningPath?.meta?.size,
                  })
                }
                title="Refresh"
              />
            </Space>
          </div>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={
            Array.isArray(learningPath?.list) ? learningPath.list : []
          }
          loading={learningPath?.loading}
          pagination={pagination}
          onChange={(p) =>
            load({ page: (p?.current ?? 1) - 1, size: p?.pageSize ?? 10 })
          }
          onRow={(row) => {
            const active = row?.isActive === true || row?.isActive === 1;
            return {
              style: {
                background: active ? "#ecfdf5" : "#fef2f2",
                boxShadow: `inset 3px 0 0 ${active ? "#34d399" : "#f87171"}`,
              },
            };
          }}
          scroll={{ x: true }}
        />
      </Card>

      {/* Truyền trực tiếp hàm API được import từ @/api/api vào prop */}
      <CreateLearningPathModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onSuccess={handleRefreshList}
        createAdminLearningPath={createAdminLearningPath}
      />

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
