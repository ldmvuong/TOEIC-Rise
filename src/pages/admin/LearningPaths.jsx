import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import useAdminLearningPath from "@/hooks/useAdminLearningPath";
import {
  createAdminLearningPath,
  getAdminLearningPathDetail,
  updateAdminLearningPath,
} from "@/api/api";

const { Title, Text } = Typography;

const SLUG_RULES = [
  { required: true, message: "Slug is required" },
  { whitespace: true, message: "Slug cannot be empty" },
  {
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    message: "Slug only allows lowercase letters, numbers, and hyphens",
  },
];

const TEST_TYPE_OPTIONS = [
  { label: "Listening & Reading", value: "LISTENING_AND_READING" },
  { label: "Speaking", value: "SPEAKING" },
  { label: "Writing", value: "WRITING" },
];

export default function AdminLearningPathsPage() {
  const learningPath = useAdminLearningPath();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const debounceRef = useRef(null);

  const load = useCallback(
    async (params = {}) => {
      try {
        await learningPath.fetchLearningPaths({
          name: params.name ?? (name || undefined),
          page: params.page ?? learningPath.meta.page ?? 0,
          size: params.size ?? learningPath.meta.size ?? 10,
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

  const columns = useMemo(
    () => [
      {
        title: "ID",
        key: "id",
        dataIndex: "id",
        width: 90,
        align: "center",
        render: (v) => <Text code>{v}</Text>,
      },
      {
        title: "Name",
        key: "name",
        dataIndex: "name",
        width: 320,
        render: (v, row) => {
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-base font-semibold text-slate-900">
                  {v || `Learning Path #${row?.id ?? ""}`}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        title: "Description",
        key: "description",
        dataIndex: "description",
        render: (v, row) => {
          const desc = (v || "").trim();
          if (!desc) return <Text type="secondary">—</Text>;

          const isExpanded = expandedIds.has(row.id);
          const shouldShowToggle = desc.length > 180;

          return (
            <div className="min-w-0">
              <div
                className={
                  isExpanded ? "text-slate-700" : "line-clamp-3 text-slate-700"
                }
              >
                {desc}
              </div>
              {shouldShowToggle ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.id)) next.delete(row.id);
                      else next.add(row.id);
                      return next;
                    });
                  }}
                >
                  {isExpanded ? "Thu gọn" : "Xem thêm"}
                </button>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "Lessons",
        key: "lessonCount",
        dataIndex: "lessonCount",
        width: 110,
        align: "center",
        render: (v) => <Text strong>{Number(v || 0)}</Text>,
      },
      {
        title: "Active",
        key: "isActive",
        dataIndex: "isActive",
        width: 110,
        align: "center",
        render: (v) => {
          const active = v === true || v === 1;
          return (
            <Tag
              color={active ? "green" : "red"}
              style={{ marginInlineEnd: 0 }}
            >
              {active ? "Active" : "Inactive"}
            </Tag>
          );
        },
      },
      {
        title: "",
        key: "actions",
        width: 110,
        align: "center",
        render: (_, row) => (
          <Space size={2}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() =>
                row?.slug && navigate(`/admin/learning-paths/${row.slug}`)
              }
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={async () => {
                if (!row?.id) return;
                setEditorOpen(true);
                setEditorLoading(true);
                setEditingId(row.id);
                form.resetFields();
                try {
                  const res = await getAdminLearningPathDetail(row.id);
                  const d = res?.data ?? {};
                  form.setFieldsValue({
                    name: d?.name ?? "",
                    slug: d?.slug ?? "",
                    description: d?.description ?? "",
                    isActive: Boolean(d?.isActive),
                    testType: d?.testType ?? "LISTENING_AND_READING",
                  });
                } catch (e) {
                  message.error(
                    e?.response?.data?.message ||
                      e?.message ||
                      "Failed to load learning path detail",
                  );
                  setEditorOpen(false);
                } finally {
                  setEditorLoading(false);
                }
              }}
            />
          </Space>
        ),
      },
    ],
    [expandedIds, form, navigate],
  );

  const pagination = useMemo(() => {
    const total = learningPath.meta?.total ?? 0;
    const current = (learningPath.meta?.page ?? 0) + 1;
    const pageSize = learningPath.meta?.size ?? 10;
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
  }, [learningPath.meta]);

  const handleTableChange = useCallback(
    (p) => {
      load({
        page: (p?.current ?? 1) - 1,
        size: p?.pageSize ?? 10,
        name: name || undefined,
      });
    },
    [load, name],
  );

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

  return (
    <div style={{ padding: 16 }}>
      <Card
        variant="outlined"
        style={{ borderRadius: 12 }}
        title={
          <div className="flex items-center justify-between gap-4">
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Learning Paths
              </Title>
            </div>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingId(null);
                  form.resetFields();
                  form.setFieldsValue({
                    name: "",
                    slug: "",
                    description: "",
                    isActive: true,
                    testType: "LISTENING_AND_READING",
                  });
                  setEditorOpen(true);
                }}
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
                    page: learningPath.meta.page,
                    size: learningPath.meta.size,
                  })
                }
                title="Refresh"
              />
            </Space>
          </div>
        }
      >
        <Table
          rowKey={(row) => row.id}
          columns={columns}
          dataSource={Array.isArray(learningPath.list) ? learningPath.list : []}
          loading={learningPath.loading}
          pagination={pagination}
          onChange={handleTableChange}
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

      <Modal
        title={
          editingId ? `Edit learning path #${editingId}` : "Add learning path"
        }
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        okText={editingId ? "Save" : "Create"}
        confirmLoading={editorLoading}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            setEditorLoading(true);
            if (editingId) {
              await updateAdminLearningPath(editingId, values);
              message.success("Updated learning path");
            } else {
              await createAdminLearningPath(values);
              message.success("Created learning path");
            }
            setEditorOpen(false);
            await load({
              page: learningPath.meta.page,
              size: learningPath.meta.size,
            });
          } catch (e) {
            if (e?.errorFields) return; // antd validation
            message.error(
              e?.response?.data?.message || e?.message || "Save failed",
            );
          } finally {
            setEditorLoading(false);
          }
        }}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: true, testType: "LISTENING_AND_READING" }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Learning path name" />
          </Form.Item>
          <Form.Item
            label="Slug"
            name="slug"
            rules={SLUG_RULES}
            normalize={(v) => (typeof v === "string" ? v.trim() : v)}
          >
            <Input placeholder="e.g. toeic-listening-foundation" />
          </Form.Item>
          <Form.Item
            label="Test type"
            name="testType"
            rules={[{ required: true, message: "Test type is required" }]}
          >
            <Select
              options={TEST_TYPE_OPTIONS}
              placeholder="Select test type"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label="Active"
            name="isActive"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} placeholder="Description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
