import { ModalForm, ProFormText } from "@ant-design/pro-components";
import { Form, message, notification } from "antd";
import { createTag } from "@/api/api";
import { TAG_NAME_REGEX } from "@/utils/validation";
import { ConfigProvider } from 'antd';
import enUS from 'antd/es/locale/en_US';

const ModalTag = (props) => {
  const { openModal, setOpenModal, reloadTable } = props;
  const [form] = Form.useForm();

  const submitTag = async (valuesForm) => {
    const { name } = valuesForm;

    const payload = {
      name: name.trim(),
    };


    try {
      await createTag(payload);
      message.success("Tag created successfully");
      handleReset();
      reloadTable && reloadTable();
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e?.message || 'Unknown error!';
      notification.error({ 
        message: "Failed to create tag", 
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
            title="Create New Tag"
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
                submitText: "Create",
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
                  message: 'Tag name can only contain letters, numbers, spaces, and characters: ().,\'[]:- (1-50 characters)'
                },
              ]}
              placeholder="Enter tag name"
              fieldProps={{
                id: 'tag_name',
                maxLength: 50,
                showCount: true
              }}
            />
          </ModalForm>
        </ConfigProvider>
      )}
    </>
  );
};

export default ModalTag;
