import { ModalForm, ProFormSwitch, ProFormText } from "@ant-design/pro-components";
import { ConfigProvider, Form, message, notification } from "antd";
import { useEffect } from "react";
import { updateBlogCategory } from "@/api/api";
import {
  BLOG_CATEGORY_NAME_REGEX,
  BLOG_CATEGORY_SLUG_REGEX,
} from "@/utils/validation";
import enUS from "antd/es/locale/en_US";

const ModalUpdateBlogCategory = (props) => {
  const { openModal, setOpenModal, reloadTable, categoryData } = props;
  const [form] = Form.useForm();

  useEffect(() => {
    if (openModal && categoryData) {
      const active =
        categoryData.active ??
        categoryData.isActive ??
        true;
      form.setFieldsValue({
        name: categoryData.name ?? "",
        slug: categoryData.slug ?? "",
        active,
      });
    } else if (!openModal) {
      form.resetFields();
    }
  }, [openModal, categoryData, form]);

  const submit = async (values) => {
    if (!categoryData?.id) return;

    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase(),
      active: values.active,
    };

    try {
      await updateBlogCategory(categoryData.id, payload);
      message.success("Blog category updated successfully");
      handleReset();
      reloadTable?.();
    } catch (e) {
      const errorMessage =
        e?.message ||
        e?.response?.data?.message ||
        "Failed to update blog category";
      notification.error({
        message: "Failed to update blog category",
        description: errorMessage,
      });
    }
  };

  const handleReset = () => {
    form.resetFields();
    setOpenModal(false);
  };

  return (
    <>
      {openModal && (
        <ConfigProvider locale={enUS}>
          <ModalForm
            title="Update blog category"
            open={openModal}
            modalProps={{
              onCancel: handleReset,
              afterClose: handleReset,
              destroyOnHidden: true,
              width: 520,
              keyboard: false,
              maskClosable: false,
            }}
            scrollToFirstError
            preserve={false}
            form={form}
            onFinish={submit}
            submitter={{
              searchConfig: {
                submitText: "Update",
                resetText: "Cancel",
              },
            }}
          >
            <ProFormText
              label="Name"
              name="name"
              rules={[
                { required: true, message: "Name is required" },
                { whitespace: true, message: "Name cannot be blank" },
                {
                  pattern: BLOG_CATEGORY_NAME_REGEX,
                  message:
                    "Use letters, digits, spaces, and .,&()- only. Length 2–50 characters.",
                },
              ]}
              placeholder="e.g. TOEIC Listening Tips"
              fieldProps={{
                id: "blog_category_name_update",
                maxLength: 50,
                showCount: true,
              }}
            />
            <ProFormText
              label="Slug"
              name="slug"
              rules={[
                { required: true, message: "Slug is required" },
                { whitespace: true, message: "Slug cannot be blank" },
                {
                  pattern: BLOG_CATEGORY_SLUG_REGEX,
                  message:
                    "Lowercase letters, digits, and hyphens only (e.g. toeic-listening-tips).",
                },
                {
                  max: 50,
                  type: "string",
                  message: "Slug must be at most 50 characters",
                },
              ]}
              placeholder="e.g. toeic-listening-tips"
              fieldProps={{
                id: "blog_category_slug_update",
                maxLength: 50,
                showCount: true,
              }}
            />
            <ProFormSwitch
              label="Active"
              name="active"
              fieldProps={{
                id: "blog_category_active_update",
              }}
            />
          </ModalForm>
        </ConfigProvider>
      )}
    </>
  );
};

export default ModalUpdateBlogCategory;
