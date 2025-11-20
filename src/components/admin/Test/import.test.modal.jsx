import { useState } from 'react';
import { Modal, Form, Input, Upload, Button, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import DebounceSelect from '../../admin/debouce.select';
import { importTests, getAllTestSets } from '../../../api/api';
import { isValidTestName } from '../../../utils/validation';

const ImportTestModal = ({ open, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

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
                message.error('Vui lòng chọn file Excel');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            formData.append(
                'testRequest',
                new Blob(
                    [
                        JSON.stringify({
                            testName: values.testName,
                            testSetId: values.testSet?.value,
                        }),
                    ],
                    { type: 'application/json' }
                )
            );

            setSubmitting(true);

            await importTests(formData);

            message.success('Import đề thi thành công');
            form.resetFields();

            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            if (err?.errorFields) return;
            const msg = err?.message || 'Import thất bại, vui lòng thử lại';
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
            message.error('Chỉ chấp nhận file .xlsx hoặc .xls');
        }
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('File phải nhỏ hơn 10MB');
        }
        return isExcel && isLt10M ? false : Upload.LIST_IGNORE;
    };

    return (
        <Modal
            title="Import đề thi TOEIC"
            open={open}
            onCancel={onClose}
            onOk={handleSubmit}
            okButtonProps={{ loading: submitting }}
            destroyOnHidden
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Tên đề thi"
                    name="testName"
                    rules={[
                        { required: true, message: 'Vui lòng nhập tên đề thi' },
                        { min: 3, message: 'Tên phải từ 3 ký tự' },
                        { max: 100, message: 'Tên tối đa 100 ký tự' },
                        {
                            validator: (_, value) => {
                                if (!value || isValidTestName(value)) return Promise.resolve();
                                return Promise.reject(new Error('Chỉ cho phép chữ, số, khoảng trắng và ()'));
                            }
                        }
                    ]}
                >
                    <Input placeholder="Nhập tên đề thi" allowClear />
                </Form.Item>

                <Form.Item
                    label="Thuộc Test Set"
                    name="testSet"
                    rules={[{ required: true, message: 'Vui lòng chọn Test Set' }]}
                >
                    <DebounceSelect
                        placeholder="Tìm kiếm test set theo tên"
                        fetchOptions={fetchTestSetOptions}
                        showSearch
                        allowClear
                        paged
                        pageSize={10}
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item
                    label="File Excel (.xlsx/.xls)"
                    name="file"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                    rules={[{ required: true, message: 'Vui lòng chọn file Excel' }]}
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
                        <p className="ant-upload-text">Kéo thả hoặc bấm để chọn file Excel</p>
                        <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx, .xls. Tối đa 10MB.</p>
                    </Upload.Dragger>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ImportTestModal;


