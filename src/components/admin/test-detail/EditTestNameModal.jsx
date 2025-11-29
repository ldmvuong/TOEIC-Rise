import { ModalForm, ProFormText } from "@ant-design/pro-components";
import { Form, message, notification } from "antd";
import { useEffect } from "react";
import { updateTest } from "@/api/api";
import { TEST_NAME_REGEX } from "@/utils/validation";

const EditTestNameModal = ({ open, onClose, test, onSuccess }) => {
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
            await updateTest(test.id, {
                name: values.name,
            });
            message.success("Cập nhật tên test thành công");
            onClose?.();
            onSuccess?.();
        } catch (error) {
            notification.error({
                message: "Cập nhật tên test thất bại",
                description: error?.response?.data?.message || error?.message || "Không thể cập nhật tên test",
            });
        }
    };

    return (
        <ModalForm
            title="Đổi tên Test"
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
        </ModalForm>
    );
};

export default EditTestNameModal;

