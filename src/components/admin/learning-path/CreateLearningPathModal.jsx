import React, { useState } from "react";
import { Modal, Form, Input, Select, Switch, message } from "antd";

export default function CreateLearningPathModal({
  open,
  onCancel,
  onSuccess,
  createAdminLearningPath,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await createAdminLearningPath(values);
      message.success("Created learning path");

      form.resetFields();
      onSuccess();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(
        e?.response?.data?.message || e?.message || "Creation failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add learning path"
      open={open}
      okText="Create"
      confirmLoading={loading}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={onOk}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: "",
          slug: "",
          description: "",
          isActive: true,
          testType: "LISTENING_AND_READING",
        }}
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[
            { required: true, message: "Please input name" },
            { max: 50, message: "Name cannot exceed 50 characters" },
          ]}
        >
          <Input maxLength={50} showCount />
        </Form.Item>
        <Form.Item
          label="Slug"
          name="slug"
          rules={[
            { required: true, message: "Please input slug" },
            { max: 50, message: "Slug cannot exceed 50 characters" },
          ]}
        >
          <Input maxLength={50} showCount />
        </Form.Item>
        <Form.Item label="Test Type" name="testType">
          <Select
            options={[
              { value: "LISTENING_AND_READING", label: "Listening & Reading" },
              { value: "SPEAKING", label: "Speaking" },
              { value: "WRITING", label: "Writing" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
