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
import viVN from 'antd/es/locale/vi_VN';

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
      message.success("Thêm mới user thành công");
      handleReset();
      reloadTable && reloadTable();
    } catch (e) {
      notification.error({ 
        message: "Có lỗi xảy ra", 
        description: e?.response?.data?.message || e?.message || 'Không rõ nguyên nhân!' 
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
    return false; // prevent auto upload
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
        <ConfigProvider locale={viVN}>
          <ModalForm
            title={'Tạo mới User'}
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
                  label="Họ tên"
                  name="fullName"
                  fieldProps={{ id: 'user_fullName' }}
                  rules={[
                    { required: true, message: 'Không được bỏ trống' },
                    {
                      validator: (_, value) =>
                        value && !isValidFullName(value)
                          ? Promise.reject("Họ tên chỉ gồm chữ cái và khoảng trắng!")
                          : Promise.resolve(),
                    },
                  ]}
                  placeholder="Nhập họ tên"
                />
              </Col>
              <Col span={12}>
                <ProFormText
                  label="Email"
                  name="email"
                  fieldProps={{ id: 'user_email', autoComplete: 'email' }}
                  rules={[
                    { required: true, message: "Không được bỏ trống" },
                    {
                      validator: (_, value) =>
                        value && !isValidEmail(value)
                          ? Promise.reject("Email không hợp lệ!")
                          : Promise.resolve(),
                    },
                  ]}
                  placeholder="Nhập email"
                />
              </Col>

              <Col span={12}>
                <ProFormText.Password
                  label="Password"
                  name="password"
                  fieldProps={{ id: 'user_password', autoComplete: 'new-password' }}
                  rules={[
                    { required: true, message: "Không được bỏ trống" },
                    {
                      validator: (_, value) =>
                        value && !isStrongPassword(value)
                          ? Promise.reject("Mật khẩu 8-20 ký tự, có hoa/thường/số/ký tự đặc biệt!")
                          : Promise.resolve(),
                    },
                  ]}
                  placeholder="Nhập mật khẩu"
                />
              </Col>
              <Col span={12}>
                <ProFormText.Password
                  label="Xác nhận Password"
                  name="confirmPassword"
                  fieldProps={{ id: 'user_confirmPassword', autoComplete: 'new-password' }}
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: "Không được bỏ trống" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                      },
                    }),
                  ]}
                  placeholder="Nhập lại mật khẩu"
                />
              </Col>

              <Col span={12}>
                <ProFormSelect
                  label="Giới Tính"
                  name="gender"
                  valueEnum={{ MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }}
                  fieldProps={{ id: 'user_gender' }}
                  rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}
                  placeholder="Chọn giới tính"
                />
              </Col>
              <Col span={12}>
                <ProFormSelect
                  label="Vai trò"
                  name="role"
                  valueEnum={{ ADMIN: 'ADMIN', LEARNER: 'LEARNER', STAFF: 'STAFF' }}
                  fieldProps={{ id: 'user_role' }}
                  rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                  placeholder="Chọn vai trò"
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