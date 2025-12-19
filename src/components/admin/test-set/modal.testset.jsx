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
                    message.success("Test set updated successfully");
                    handleReset();
                    reloadTable();
                }
            } catch (error) {
                notification.error({
                    message: 'Failed to update test set',
                    description: error?.message || 'Unable to update test set'
                });
            }
        } else {
            const testSet = {
                testName
            };

            try {
                const res = await createTestSet(testSet);
                if (res.data) {
                    message.success("Test set created successfully");
                    handleReset();
                    reloadTable();
                } 
            } catch (error) {
                notification.error({
                    message: 'Failed to create test set',
                    description: error?.message || 'Unable to create test set'
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
            title={<>{dataInit?.id ? "Update Test Set" : "Create Test Set"}</>}
            open={openModal}
            modalProps={{
                onCancel: () => { handleReset() },
                afterClose: () => handleReset(),
                destroyOnHidden: true,
                keyboard: false,
                maskClosable: false,
                okText: <>{dataInit?.id ? "Update" : "Create"}</>,
                cancelText: "Cancel"
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
                        label="Test Set Name"
                        name="testName"
                        rules={[
                            { required: true, message: 'Please enter test set name' },
                            { 
                                pattern: TEST_SET_NAME_REGEX, 
                                message: 'Test set name can only contain letters, numbers, spaces and parentheses' 
                            },    
                        ]}
                        placeholder="Enter test set name (e.g., ETS TOEIC 2024)"
                    />
                </Col>
                {dataInit?.id && (
                    <Col lg={24} md={24} sm={24} xs={24}>
                        <ProFormSelect
                            name="status"
                            label="Status"
                            valueEnum={{
                                'IN USE': 'IN USE',
                                'DELETED': 'DELETED',
                            }}
                            placeholder="Select status"
                            rules={[{ required: true, message: 'Please select status!' }]}
                        />
                    </Col>
                )}
            </Row>
        </ModalForm>
    );
};

export default ModalTestSet;
