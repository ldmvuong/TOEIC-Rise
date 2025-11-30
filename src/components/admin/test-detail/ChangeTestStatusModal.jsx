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
            message.success("Đổi trạng thái test thành công");
            onClose?.();
            onSuccess?.();
        } catch (error) {
            notification.error({
                message: "Đổi trạng thái test thất bại",
                description: error?.response?.data?.message || error?.message || "Không thể đổi trạng thái test",
            });
        }
    };

    return (
        <ModalForm
            title="Đổi trạng thái Test"
            open={open}
            modalProps={{
                onCancel: () => onClose?.(),
                destroyOnHidden: true,
                maskClosable: false,
                okText: "Cập nhật",
                cancelText: "Hủy",
            }}
            form={form}
            onFinish={handleFinish}
        >
            <ProFormSelect
                name="status"
                label="Trạng thái"
                valueEnum={{
                    PENDING: "PENDING",
                    APPROVED: "APPROVED",
                    REJECTED: "REJECTED",
                    DELETED: "DELETED",
                }}
                rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
                placeholder="Chọn trạng thái"
            />
        </ModalForm>
    );
};

export default ChangeTestStatusModal;

