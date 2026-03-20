import React, { useRef, useState, useMemo } from "react";
import DataTable from "@/components/admin/data-table";
import { Tag, Button, Modal, Form, Input, Switch, message, notification } from "antd";
import queryString from "query-string";
import { getSystemPrompts, createSystemPrompt, changeSystemPromptActive } from "@/api/api";
import { useNavigate } from "react-router-dom";
import { SYSTEM_PROMPT_CONTENT_REGEX } from "@/utils/validation";

const SystemPromptsPage = ({ featureType, title }) => {
  const tableRef = useRef();
  const formRef = useRef();
  const navigate = useNavigate();

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ page: 0, pageSize: 10, total: 0 });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const routeType = useMemo(() => {
    switch (featureType) {
      case "CHATBOT":
        return "chatbot";
      case "Q_AND_A":
        return "q-and-a";
      case "EXPLANATION_GENERATION":
        return "explanation";
      case "SENTENCE_ASSESSMENT":
        return "sentence-assessment";
      default:
        return "chatbot";
    }
  }, [featureType]);

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 60,
      align: "center",
      render: (_text, _record, index) => (
        <>{index + 1 + meta.page * meta.pageSize}</>
      ),
      hideInSearch: true,
    },
    {
      title: "Version",
      dataIndex: "version",
      width: 90,
      sorter: true,
    },
    {
      title: "Content",
      dataIndex: "content",
      ellipsis: true,
      render: (text) => (
        <div
          style={{
            maxWidth: 700,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: "Active",
      dataIndex: "isActive",
      width: 120,
      align: "center",
      sorter: true,
      render: (val, record) => {
        const isToggling = togglingId === record.id;
        return (
          <Switch
            checked={!!val}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            loading={isToggling}
            disabled={isToggling}
            onChange={async () => {
              setTogglingId(record.id);
              try {
                await changeSystemPromptActive(featureType, record.id);
                message.success("Status updated");
                if (tableRef.current) {
                  tableRef.current.reload();
                }
              } catch (err) {
                const desc =
                  err?.message ||
                  err?.data?.message ||
                  "Failed to change status";
                notification.error({
                  message: "Failed to change status",
                  description: desc,
                });
              } finally {
                setTogglingId(null);
              }
            }}
          />
        );
      },
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      width: 200,
      sorter: true,
      render: (val) => {
        if (!val) return "-";
        const date = new Date(val);
        // Fallback if invalid date
        if (Number.isNaN(date.getTime())) return val;
        return date.toLocaleString();
      },
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      align: "center",
      hideInSearch: true,
      render: (_text, record) => (
        <Button
          type="link"
          onClick={() =>
            navigate(`/admin/system-prompts/${routeType}/${record.id}`)
          }
        >
          View
        </Button>
      ),
    },
  ];

  const handleOpenCreate = () => {
    form.resetFields();
    setCreateModalOpen(true);
  };

  const handleCancelCreate = () => {
    setCreateModalOpen(false);
    form.resetFields();
  };

  const handleSubmitCreate = async () => {
    try {
      const values = await form.validateFields();
      const rawContent = values.content || "";
      const trimmed = rawContent.trim();

      if (!trimmed || trimmed.length < 20) {
        throw new Error("Content must be at least 20 characters");
      }

      if (!SYSTEM_PROMPT_CONTENT_REGEX.test(trimmed)) {
        throw new Error(
          "Content can only contain letters, digits, spaces, and punctuation (.,!?()'\"-+)"
        );
      }

      setSubmitting(true);
      await createSystemPrompt(featureType, { content: trimmed });
      message.success("System prompt created successfully");
      handleCancelCreate();
      if (tableRef.current) {
        tableRef.current.reload();
      }
    } catch (err) {
      if (err?.errorFields) {
        // Ant Design form validation error
        return;
      }
      const desc =
        err?.message ||
        err?.data?.message ||
        "Failed to create system prompt";
      notification.error({
        message: "Failed to create system prompt",
        description: desc,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const buildQuery = (params, sort) => {
    const clone = { ...params };
    const q = {
      featureType,
      page: (clone.current || 1) - 1,
      size: clone.pageSize || 10,
    };

    let sortBy = "";
    let direction = "DESC";

    if (sort?.version) {
      sortBy = "version";
      direction = sort.version === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.updatedAt) {
      sortBy = "updatedAt";
      direction = sort.updatedAt === "ascend" ? "ASC" : "DESC";
    }

    if (!sortBy) {
      sortBy = "version";
      direction = "DESC";
    }

    const baseQuery = queryString.stringify(q);
    return `${baseQuery}&sortBy=${sortBy}&direction=${direction}`;
  };

  return (
    <div>
      <DataTable
        actionRef={tableRef}
        formRef={formRef}
        headerTitle={title}
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={prompts}
        request={async (params, sort) => {
          setLoading(true);
          try {
            const query = buildQuery(params, sort);
            const response = await getSystemPrompts(query);
            const data = response?.data || {};
            setPrompts(data.result || []);
            setMeta({
              page: data.meta?.page ?? 0,
              pageSize: data.meta?.pageSize ?? 10,
              total: data.meta?.total ?? 0,
            });
          } catch (error) {
            console.error("Failed to fetch system prompts", error);
            setPrompts([]);
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
        search={false}
        toolBarRender={() => [
          <Button key="add" type="primary" onClick={handleOpenCreate}>
            New System Prompt
          </Button>,
        ]}
      />

      <Modal
        title={`Create ${title}`}
        open={createModalOpen}
        onCancel={handleCancelCreate}
        onOk={handleSubmitCreate}
        okText="Create"
        cancelText="Cancel"
        confirmLoading={submitting}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Content"
            name="content"
            rules={[
              { required: true, message: "Content must not be blank" },
              {
                validator: (_, value) => {
                  const trimmed = (value || "").trim();
                  if (!trimmed || trimmed.length < 20) {
                    return Promise.reject(
                      new Error("Content must be at least 20 characters")
                    );
                  }
                  if (!SYSTEM_PROMPT_CONTENT_REGEX.test(trimmed)) {
                    return Promise.reject(
                      new Error(
                        "Content can only contain letters, digits, spaces, and punctuation (.,!?()'\"-+)"
                      )
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.TextArea
              rows={8}
              maxLength={4000}
              showCount
              placeholder="Enter system prompt content"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemPromptsPage;

