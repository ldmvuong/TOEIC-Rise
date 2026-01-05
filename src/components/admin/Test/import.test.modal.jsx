import { useState, useEffect } from 'react';
import { Modal, Form, Input, Upload, Button, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import DebounceSelect from '../../admin/debouce.select';
import { importTests, getAllTestSets } from '../../../api/api';
import { isValidTestName } from '../../../utils/validation';

const ImportTestModal = ({ open, onClose, onSuccess, defaultTestSetId, defaultTestSetName }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    
    // Set default test set khi mở modal
    useEffect(() => {
        if (open) {
            if (defaultTestSetId && defaultTestSetName) {
                // Set giá trị mặc định từ props
                form.setFieldsValue({
                    testSet: { label: defaultTestSetName, value: defaultTestSetId }
                });
            } else if (defaultTestSetId) {
                // Nếu chỉ có ID, fetch thông tin test set
                const fetchTestSetInfo = async () => {
                    try {
                        const params = new URLSearchParams();
                        params.set('page', '0');
                        params.set('size', '100');
                        params.set('sortBy', 'updatedAt');
                        params.set('direction', 'DESC');
                        const res = await getAllTestSets(params.toString());
                        const testSet = res?.data?.result?.find(item => item.id === defaultTestSetId);
                        if (testSet) {
                            form.setFieldsValue({
                                testSet: { label: testSet.name, value: testSet.id }
                            });
                        }
                    } catch (error) {
                        // Silent error
                    }
                };
                fetchTestSetInfo();
            } else {
                // Reset form nếu không có defaultTestSetId
                form.setFieldsValue({
                    testSet: undefined
                });
            }
        }
    }, [open, defaultTestSetId, defaultTestSetName, form]);

    const fetchTestSetOptions = async (value, page = 0, size = 10) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('size', String(size));
        params.set('sortBy', 'updatedAt');
        params.set('direction', 'DESC');
        if (value) params.set('name', value);
        const res = await getAllTestSets(params.toString());
        const list = res?.data?.result || [];
        const meta = res?.data?.meta || { page, pageSize: size, total: list.length };
        const hasMore = (meta.page + 1) * meta.pageSize < meta.total;
        return { options: list.map(item => ({ label: item.name, value: item.id })), hasMore };
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            const file = Array.isArray(values.file)
                ? values.file[0]?.originFileObj
                : undefined;

            if (!file) {
                message.error('Please select Excel file');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            formData.append(
                'testRequest',
                JSON.stringify({
                    testName: values.testName,
                    testSetId: values.testSet?.value || defaultTestSetId,
                })
            );

            setSubmitting(true);

            await importTests(formData);

            message.success('Test imported successfully');
            
            // Reset form
            form.resetFields();
            if (defaultTestSetId && defaultTestSetName) {
                // Keep testSet value if defaultTestSetId exists
                form.setFieldsValue({
                    testSet: { label: defaultTestSetName, value: defaultTestSetId }
                });
            }

            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            if (err?.errorFields) return;
            const msg = err?.message || 'Import failed, please try again';
            message.error(msg);
        } finally {
            setSubmitting(false);
        }
    };



    const normFile = (e) => {
        if (Array.isArray(e)) return e;
        return e?.fileList?.filter(f => !!f.originFileObj) || [];
    };

    const beforeUpload = (file) => {
        const isExcel =
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel' ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls');
        if (!isExcel) {
            message.error('Only .xlsx or .xls files are accepted');
        }
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('File must be smaller than 10MB');
        }
        return isExcel && isLt10M ? false : Upload.LIST_IGNORE;
    };

    const modalTitle = defaultTestSetName 
        ? `Import test to ${defaultTestSetName}`
        : "Import TOEIC Test";

    return (
        <Modal
            title={modalTitle}
            open={open}
            onCancel={onClose}
            onOk={handleSubmit}
            okButtonProps={{ loading: submitting }}
            destroyOnHidden
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Test Name"
                    name="testName"
                    rules={[
                        { required: true, message: 'Please enter test name' },
                        { min: 3, message: 'Name must be at least 3 characters' },
                        { max: 100, message: 'Name must not exceed 100 characters' },
                        {
                            validator: (_, value) => {
                                if (!value || isValidTestName(value)) return Promise.resolve();
                                return Promise.reject(new Error('Only letters, numbers, spaces and () are allowed'));
                            }
                        }
                    ]}
                >
                    <Input placeholder="Enter test name" allowClear />
                </Form.Item>

                {!defaultTestSetId && (
                    <Form.Item
                        label="Test Set"
                        name="testSet"
                        rules={[{ required: true, message: 'Please select Test Set' }]}
                    >
                        <DebounceSelect
                            placeholder="Search test set by name"
                            fetchOptions={fetchTestSetOptions}
                            showSearch
                            allowClear
                            paged
                            pageSize={10}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                )}

                <Form.Item
                    label="Excel File (.xlsx/.xls)"
                    name="file"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                    rules={[{ required: true, message: 'Please select Excel file' }]}
                >
                    <Upload.Dragger
                        name="file"
                        multiple={false}
                        beforeUpload={beforeUpload}
                        maxCount={1}
                        accept=".xlsx,.xls"
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Drag and drop or click to select Excel file</p>
                        <p className="ant-upload-hint">Supports .xlsx, .xls formats. Max 10MB.</p>
                    </Upload.Dragger>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ImportTestModal;


