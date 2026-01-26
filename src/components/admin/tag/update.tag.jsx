import { ModalForm, ProFormText } from "@ant-design/pro-components";
import { Form, message, notification } from "antd";
import { useEffect } from "react";
import { updateTag } from "@/api/api";
import { TAG_NAME_REGEX } from "@/utils/validation";
import { ConfigProvider } from 'antd';
import enUS from 'antd/es/locale/en_US';

const ModalTagUpdate = (props) => {
  const { openModal, setOpenModal, reloadTable, tagData } = props;
  const [form] = Form.useForm();

  useEffect(() => {
    if (openModal && tagData) {
      form.setFieldsValue({
        name: tagData.name || "",
      });
    } else if (!openModal) {
      form.resetFields();
    }
  }, [openModal, tagData, form]);

  const submitTag = async (valuesForm) => {
    if (!tagData?.id) return;

    const { name } = valuesForm;

    const payload = {
      name: name.trim(),
    };

    try {
      await updateTag(tagData.id, payload);
      message.success("Tag updated successfully");
      handleReset();
      reloadTable && reloadTable();
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e?.message || 'Unknown error!';
      notification.error({ 
        message: "Failed to update tag", 
        description: errorMessage
      });
    }
  };

  const handleReset = async () => {
    form.resetFields();
    setOpenModal(false);
  };

  return (
    <>
      {openModal && (
        <ConfigProvider locale={enUS}>
          <ModalForm
            title="Update Tag"
            open={openModal}
            modalProps={{
              onCancel: handleReset,
              afterClose: handleReset,
              destroyOnHidden: true,
              width: 500,
              keyboard: false,
              maskClosable: false
            }}
            scrollToFirstError
            preserve={false}
            form={form}
            onFinish={submitTag}
            submitter={{
              searchConfig: {
                submitText: "Update",
                resetText: "Cancel",
              },
            }}
          >
            <ProFormText
              label="Tag Name"
              name="name"
              rules={[
                { required: true, message: 'Tag name cannot be empty' },
                { whitespace: true, message: 'Tag name cannot be blank' },
                {
                  pattern: TAG_NAME_REGEX,
                  message: 'Tag name can only contain letters, numbers, spaces, and characters: ().,\'[]:- (1-100 characters)'
                },
              ]}
              placeholder="Enter tag name"
              fieldProps={{
                id: 'tag_name_update',
                maxLength: 100,
                showCount: true
              }}
            />
          </ModalForm>
        </ConfigProvider>
      )}
    </>
  );
};

export default ModalTagUpdate;
