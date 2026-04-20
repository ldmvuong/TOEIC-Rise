import { ModalForm, ProFormText } from "@ant-design/pro-components";
import { Form, message, notification } from "antd";
import { useEffect } from "react";
import { updateTest as defaultUpdateTest } from "@/api/api";
import { TEST_NAME_REGEX } from "@/utils/validation";

const EditTestNameModal = ({ open, onClose, test, onSuccess, updateTestFn = defaultUpdateTest }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                name: test?.name || "",
            });
        } else {
            form.resetFields();
        }
    }, [open, test, form]);

    const handleFinish = async (values) => {
        try {
            await updateTestFn(test.id, {
                name: values.name,
            });
            message.success("Test name updated successfully");
            onClose?.();
            onSuccess?.();
        } catch (error) {
            notification.error({
                message: "Failed to update test name",
                description: error?.response?.data?.message || error?.message || "Unable to update test name",
            });
        }
    };

    return (
        <ModalForm
            title="Edit Test Name"
            open={open}
            modalProps={{
                onCancel: () => onClose?.(),
                destroyOnHidden: true,
                maskClosable: false,
                okText: "Update",
                cancelText: "Cancel",
            }}
            form={form}
            onFinish={handleFinish}
        >
            <ProFormText
                label="Test Name"
                name="name"
                rules={[
                    { required: true, message: "Please enter test name" },
                    { pattern: TEST_NAME_REGEX, message: "Invalid test name" },
                ]}
                placeholder="Enter test name"
            />
        </ModalForm>
    );
};

export default EditTestNameModal;

