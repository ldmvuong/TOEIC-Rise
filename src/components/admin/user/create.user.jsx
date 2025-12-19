import { ModalForm, ProForm, ProFormText, ProFormSelect, FooterToolbar } from "@ant-design/pro-components";
import { Col, Form, Row, Upload, Button, Modal, message, notification } from "antd";
import { useState } from "react";
import { UploadOutlined, CheckSquareOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { createUser } from "@/api/api";
import {
  isValidEmail,
  isStrongPassword,
  isValidFullName,
  validateAvatar
} from "@/utils/validation";
import { ConfigProvider } from 'antd';
import enUS from 'antd/es/locale/en_US';

const ModalUser = (props) => {
  const { openModal, setOpenModal, reloadTable } = props;
  const [form] = Form.useForm();
  const [avatarFile, setAvatarFile] = useState(null);
  const [animation, setAnimation] = useState('open');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [loadingUpload, setLoadingUpload] = useState(false);

  const submitUser = async (valuesForm) => {
    const { email, password, confirmPassword, fullName, gender, role } = valuesForm;

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('confirmPassword', confirmPassword);
    formData.append('fullName', fullName);
    formData.append('gender', gender);
    formData.append('role', role);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      await createUser(formData);
      message.success("User created successfully");
      handleReset();
      reloadTable && reloadTable();
    } catch (e) {
      notification.error({ 
        message: "An error occurred", 
        description: e?.response?.data?.message || e?.message || 'Unknown error!' 
      })
    }
  };

  const handleReset = async () => {
    form.resetFields();
    setAvatarFile(null);
    setAnimation('close');
    await new Promise((r) => setTimeout(r, 300));
    setOpenModal(false);
    setAnimation('open');
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    form.setFieldValue('avatar', undefined);
  };

  const beforeUpload = (file) => {
    const result = validateAvatar(file);
    if (!result.valid) {
      message.error(result.errors.join(', '));
      return Upload.LIST_IGNORE;
    }
    setAvatarFile(file);
    return false;
  };

  const handleChange = (info) => {
    if (info.file.status === 'uploading') setLoadingUpload(true);
    if (info.file.status === 'done' || info.file.status === 'removed') setLoadingUpload(false);
  };

  const handlePreview = async (file) => {
    if (!file.originFileObj && file.url) {
      setPreviewImage(file.url);
      setPreviewOpen(true);
      setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
      return;
    }
    const f = file.originFileObj || avatarFile;
    if (f) {
      const url = await toBase64(f);
      setPreviewImage(url);
      setPreviewOpen(true);
      setPreviewTitle(file.name || 'Avatar');
    }
  };

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  };

  return (
    <>
      {openModal && (
        <ConfigProvider locale={enUS}>
          <ModalForm
            title={'Create New User'}
            open={openModal}
            modalProps={{
              onCancel: handleReset,
              afterClose: handleReset,
              destroyOnHidden: true,
              width: 700,
              keyboard: false,
              maskClosable: false
            }}
            scrollToFirstError
            preserve={false}
            form={form}
            onFinish={submitUser}
            initialValues={{ gender: 'MALE', role: 'LEARNER' }}
            submitter={{
              searchConfig: {
                submitText: "Confirm",
                resetText: "Cancel",
              },
            }}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Avatar" name="avatar" rules={[{ required: false }]}
                  labelCol={{ span: 24 }}>
                  <Upload
                    listType="picture-card"
                    className="avatar-uploader"
                    maxCount={1}
                    multiple={false}
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                    onRemove={handleRemoveAvatar}
                    onPreview={handlePreview}
                    fileList={avatarFile ? [{
                      uid: '-1',
                      name: avatarFile.name,
                      status: 'done',
                      originFileObj: avatarFile
                    }] : []}
                  >
                    <div>
                      {loadingUpload ? <LoadingOutlined /> : <PlusOutlined />}
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  </Upload>
                </Form.Item>
              </Col>

              <Col span={12}>
                <ProFormText
                  label="Full Name"
                  name="fullName"
                  fieldProps={{ id: 'user_fullName' }}
                  rules={[
                    { required: true, message: 'Cannot be empty' },
                    {
                      validator: (_, value) =>
                        value && !isValidFullName(value)
                          ? Promise.reject("Full name must contain only letters and spaces!")
                          : Promise.resolve(),
                    },
                  ]}
                  placeholder="Enter full name"
                />
              </Col>
              <Col span={12}>
                <ProFormText
                  label="Email"
                  name="email"
                  fieldProps={{ id: 'user_email', autoComplete: 'email' }}
                  rules={[
                    { required: true, message: "Cannot be empty" },
                    {
                      validator: (_, value) =>
                        value && !isValidEmail(value)
                          ? Promise.reject("Invalid email!")
                          : Promise.resolve(),
                    },
                  ]}
                  placeholder="Enter email"
                />
              </Col>

              <Col span={12}>
                <ProFormText.Password
                  label="Password"
                  name="password"
                  fieldProps={{ id: 'user_password', autoComplete: 'new-password' }}
                  rules={[
                    { required: true, message: "Cannot be empty" },
                    {
                      validator: (_, value) =>
                        value && !isStrongPassword(value)
                          ? Promise.reject("Password must be 8-20 characters with uppercase, lowercase, number, and special character!")
                          : Promise.resolve(),
                    },
                  ]}
                  placeholder="Enter password"
                />
              </Col>
              <Col span={12}>
                <ProFormText.Password
                  label="Confirm Password"
                  name="confirmPassword"
                  fieldProps={{ id: 'user_confirmPassword', autoComplete: 'new-password' }}
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: "Cannot be empty" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Passwords do not match!"));
                      },
                    }),
                  ]}
                  placeholder="Re-enter password"
                />
              </Col>

              <Col span={12}>
                <ProFormSelect
                  label="Gender"
                  name="gender"
                  valueEnum={{ MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' }}
                  fieldProps={{ id: 'user_gender' }}
                  rules={[{ required: true, message: 'Please select gender!' }]}
                  placeholder="Select gender"
                />
              </Col>
              <Col span={12}>
                <ProFormSelect
                  label="Role"
                  name="role"
                  valueEnum={{ ADMIN: 'ADMIN', LEARNER: 'LEARNER', STAFF: 'STAFF' }}
                  fieldProps={{ id: 'user_role' }}
                  rules={[{ required: true, message: 'Please select role!' }]}
                  placeholder="Select role"
                />
              </Col>
            </Row>
          </ModalForm>
          <Modal
            open={previewOpen}
            title={previewTitle}
            footer={null}
            onCancel={() => setPreviewOpen(false)}
            style={{ zIndex: 1500 }}
          >
            <img alt="avatar" style={{ width: '100%' }} src={previewImage} />
          </Modal>
        </ConfigProvider>
      )}
    </>
  );
};

export default ModalUser;