import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Switch, message } from "antd";

export default function EditLearningPathModal({
  open,
  onCancel,
  onSuccess,
  updateAdminLearningPath,
  initialValues,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [open, initialValues, form]);

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await updateAdminLearningPath(initialValues.id, values);
      message.success("Updated learning path");

      onSuccess();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(
        e?.response?.data?.message || e?.message || "Update failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit learning path"
      open={open}
      okText="Save changes"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={onOk}
    >
      <Form form={form} layout="vertical">
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
        <Form.Item label="Is Active" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
