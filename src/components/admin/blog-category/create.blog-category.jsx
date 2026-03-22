import { ModalForm, ProFormText } from "@ant-design/pro-components";
import { ConfigProvider, Form, message, notification } from "antd";
import { createBlogCategory } from "@/api/api";
import {
  BLOG_CATEGORY_NAME_REGEX,
  BLOG_CATEGORY_SLUG_REGEX,
} from "@/utils/validation";
import enUS from "antd/es/locale/en_US";

const ModalCreateBlogCategory = (props) => {
  const { openModal, setOpenModal, reloadTable } = props;
  const [form] = Form.useForm();

  const submit = async (values) => {
    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase(),
    };

    try {
      await createBlogCategory(payload);
      message.success("Blog category created successfully");
      handleReset();
      reloadTable?.();
    } catch (e) {
      const errorMessage =
        e?.message ||
        e?.response?.data?.message ||
        "Failed to create blog category";
      notification.error({
        message: "Failed to create blog category",
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
            title="Create blog category"
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
                submitText: "Create",
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
                id: "blog_category_name",
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
                id: "blog_category_slug",
                maxLength: 50,
                showCount: true,
              }}
            />
          </ModalForm>
        </ConfigProvider>
      )}
    </>
  );
};

export default ModalCreateBlogCategory;
