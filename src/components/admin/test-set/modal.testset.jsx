import { ModalForm, ProForm, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { Col, Form, Row, message, notification } from "antd";
import { useState, useEffect } from "react";
import { createTestSet, updateTestSet } from "@/api/api";
import { TEST_SET_NAME_REGEX } from "@/utils/validation";

const ModalTestSet = (props) => {
    const { openModal, setOpenModal, reloadTable, dataInit, setDataInit } = props;
    const [form] = Form.useForm();

    useEffect(() => {
        if (openModal) {
            if (dataInit?.id) {
                form.setFieldsValue({
                    testName: dataInit.name,
                    status: dataInit.status ? dataInit.status.replace('_', ' ') : 'IN USE'
                });
            } else {
                form.resetFields();
            }
        }
    }, [openModal, dataInit]);

    const submitTestSet = async (valuesForm) => {
        const { testName, status } = valuesForm;
        
        if (dataInit?.id) {
            const testSet = {
                id: dataInit.id,
                testName,
                status: status ? status.replace(' ', '_') : 'IN_USE'
            };

            try {
                const res = await updateTestSet(testSet);
                if (res.data) {
                    message.success("Cập nhật test set thành công");
                    handleReset();
                    reloadTable();
                }
            } catch (error) {
                notification.error({
                    message: 'Cập nhật test set thất bại',
                    description: error?.message || 'Không thể cập nhật test set'
                });
            }
        } else {
            const testSet = {
                testName
            };

            try {
                const res = await createTestSet(testSet);
                if (res.data) {
                    message.success("Thêm mới test set thành công");
                    handleReset();
                    reloadTable();
                } 
            } catch (error) {
                notification.error({
                    message: 'Thêm mới test set thất bại',
                    description: error?.message || 'Không thể tạo test set'
                });
            }
        }
    };

    const handleReset = async () => {
        form.resetFields();
        setDataInit(null);
        setOpenModal(false);
    };

    return (
        <ModalForm
            title={<>{dataInit?.id ? "Cập nhật Test Set" : "Tạo mới Test Set"}</>}
            open={openModal}
            modalProps={{
                onCancel: () => { handleReset() },
                afterClose: () => handleReset(),
                destroyOnHidden: true,
                keyboard: false,
                maskClosable: false,
                okText: <>{dataInit?.id ? "Cập nhật" : "Tạo mới"}</>,
                cancelText: "Hủy"
            }}
            scrollToFirstError={true}
            preserve={false}
            form={form}
            onFinish={submitTestSet}
            initialValues={{}}
        >
            <Row gutter={16}>
                <Col lg={24} md={24} sm={24} xs={24}>
                    <ProFormText
                        label="Tên Test Set"
                        name="testName"
                        rules={[
                            { required: true, message: 'Vui lòng không bỏ trống tên test set' },
                            { 
                                pattern: TEST_SET_NAME_REGEX, 
                                message: 'Tên test set chỉ được chứa chữ cái, số, dấu cách và dấu ngoặc đơn' 
                            },    
                        ]}
                        placeholder="Nhập tên test set (ví dụ: ETS TOEIC 2024)"
                    />
                </Col>
                {dataInit?.id && (
                    <Col lg={24} md={24} sm={24} xs={24}>
                        <ProFormSelect
                            name="status"
                            label="Trạng thái"
                            valueEnum={{
                                'IN USE': 'IN USE',
                                'DELETED': 'DELETED',
                            }}
                            placeholder="Chọn trạng thái"
                            rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                        />
                    </Col>
                )}
            </Row>
        </ModalForm>
    );
};

export default ModalTestSet;
