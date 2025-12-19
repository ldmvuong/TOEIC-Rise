import { ModalForm, ProFormSelect } from "@ant-design/pro-components";
import { Form, message, notification } from "antd";
import { useEffect } from "react";
import { changeTestStatus } from "@/api/api";

const ChangeTestStatusModal = ({ open, onClose, test, onSuccess }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                status: test?.status || "PENDING",
            });
        } else {
            form.resetFields();
        }
    }, [open, test, form]);

    const handleFinish = async (values) => {
        try {
            await changeTestStatus(test.id, values.status);
            message.success("Test status changed successfully");
            onClose?.();
            onSuccess?.();
        } catch (error) {
            notification.error({
                message: "Failed to change test status",
                description: error?.response?.data?.message || error?.message || "Unable to change test status",
            });
        }
    };

    return (
        <ModalForm
            title="Change Test Status"
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
            <ProFormSelect
                name="status"
                label="Status"
                valueEnum={{
                    PENDING: "PENDING",
                    APPROVED: "APPROVED",
                    REJECTED: "REJECTED",
                    DELETED: "DELETED",
                }}
                rules={[{ required: true, message: "Please select status" }]}
                placeholder="Select status"
            />
        </ModalForm>
    );
};

export default ChangeTestStatusModal;

