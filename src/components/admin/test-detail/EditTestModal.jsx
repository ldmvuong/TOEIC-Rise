import { ModalForm, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { Form, message, notification } from "antd";
import { useEffect } from "react";
import { updateTest } from "@/api/api";
import { TEST_NAME_REGEX } from "@/utils/validation";

const EditTestModal = ({ open, onClose, test, onSuccess }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                name: test?.name || "",
                status: test?.status || "PENDING",
            });
        } else {
            form.resetFields();
        }
    }, [open, test]);

    const handleFinish = async (values) => {
        try {
            const res = await updateTest(test.id, {
                name: values.name,
                status: values.status,
            });
            if (res?.data) {
                message.success("Cập nhật test thành công");
                onClose?.();
                onSuccess?.();
            }
        } catch (error) {
            notification.error({
                message: "Cập nhật test thất bại",
                description: error?.message || "Không thể cập nhật test",
            });
        }
    };

    return (
        <ModalForm
            title={<>Chỉnh sửa thông tin Test</>}
            open={open}
            modalProps={{
                onCancel: () => onClose?.(),
                destroyOnClose: true,
                maskClosable: false,
                okText: "Cập nhật",
                cancelText: "Hủy",
            }}
            form={form}
            onFinish={handleFinish}
        >
            <ProFormText
                label="Tên Test"
                name="name"
                rules={[
                    { required: true, message: "Vui lòng nhập tên test" },
                    { pattern: TEST_NAME_REGEX, message: "Tên test không hợp lệ" },
                ]}
                placeholder="Nhập tên test"
            />
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

export default EditTestModal;


