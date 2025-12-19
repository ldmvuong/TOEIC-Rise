import { useEffect, useState } from "react";
import { ModalForm, ProFormText, ProFormSelect } from "@ant-design/pro-components";
import { Col, Form, Row, Upload, message, notification, ConfigProvider, Spin, Modal, Tag, Switch } from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import enUS from "antd/es/locale/en_US";
import { getUserById, updateUser, resetUserPassword } from "@/api/api";
import { isValidFullName, isStrongPassword, validateAvatar } from "@/utils/validation";
import dayjs from "dayjs";

const ModalUserUpdate = (props) => {
  const { openModal, setOpenModal, userId, reloadTable } = props;
  const [form] = Form.useForm();
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [user, setUser] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!openModal || !userId) return;
      try {
        setLoadingUser(true);
        const res = await getUserById(userId);
        const data = res?.data || null;
        if (data) {
          const authProvider = (data.authProvider || "GOOGLE").toUpperCase();
          setUser({ ...data, authProvider });
          form.setFieldsValue({
            fullName: data.fullName,
            email: data.email,
            gender: data.gender,
            role: data.role,
            isActive: data.isActive ? "true" : "false",
            authProvider,
          });
        }
      } catch (e) {
        notification.error({
          message: "Failed to fetch user information",
          description: e?.response?.data?.message || e?.message || "Unknown error!",
        });
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();

    if (!openModal) {
      form.resetFields();
      setAvatarFile(null);
      setUser(null);
    }
  }, [openModal, userId, form]);

  const handleReset = () => {
    setOpenModal(false);
  };

  const submitUser = async (valuesForm) => {
    if (!userId) return;

    const { fullName, gender, role, isActive, newPassword, confirmNewPassword } = valuesForm;

    const buildFormData = () => {
      const formData = new FormData();
      formData.append("fullName", fullName);
      if (gender) formData.append("gender", gender);
      if (role) formData.append("role", role);

      if (typeof isActive !== "undefined") {
        const activeBool = isActive === true || isActive === "true";
        formData.append("isActive", activeBool);
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      return formData;
    };

    const doUpdateUser = async () => {
      try {
        const formData = buildFormData();
        await updateUser(userId, formData);
        message.success("User updated successfully");
        handleReset();
        reloadTable && reloadTable();
      } catch (e) {
        notification.error({
          message: "An error occurred",
          description: e?.response?.data?.message || e?.message || "Unknown error!",
        });
        throw e;
      }
    };

    const doResetPassword = async () => {
      try {
        await resetUserPassword(userId, {
          password: newPassword,
          confirmPassword: confirmNewPassword,
        });
        message.success("User password changed successfully");
        setChangingPassword(false);
        form.setFieldsValue({
          newPassword: undefined,
          confirmNewPassword: undefined,
        });
      } catch (e) {
        notification.error({
          message: "Có lỗi xảy ra",
          description: e?.response?.data?.message || e?.message || "Không rõ nguyên nhân!",
        });
        throw e;
      }
    };

    if (changingPassword) {
      if (!newPassword) {
        message.error("Please enter new password");
        return;
      }

      return new Promise((resolve, reject) => {
        Modal.confirm({
          title: "Confirm Password Change",
          content: (
            <div>
              You are about to reset the password for account{" "}
              <strong>{user?.email || "this"}</strong>. Are you sure?
            </div>
          ),
          okText: "Change Password",
          cancelText: "Cancel",
          onOk: async () => {
            try {
              await doResetPassword();
              resolve(true);
            } catch (e) {
              reject(e);
            }
          },
          onCancel: () => resolve(false),
        });
      });
    }

    await doUpdateUser();
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
  };

  const beforeUpload = (file) => {
    const result = validateAvatar(file);
    if (!result.valid) {
      message.error(result.errors.join(", "));
      return Upload.LIST_IGNORE;
    }
    setAvatarFile(file);
    return false;
  };

  const handleChange = (info) => {
    if (info.file.status === "uploading") setLoadingUpload(true);
    if (info.file.status === "done" || info.file.status === "removed") setLoadingUpload(false);
  };

  const handlePreview = async (file) => {
    if (!file.originFileObj && file.url) {
      setPreviewImage(file.url);
      setPreviewOpen(true);
      setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf("/") + 1));
      return;
    }
    const f = file.originFileObj || avatarFile;
    if (f) {
      const url = await toBase64(f);
      setPreviewImage(url);
      setPreviewOpen(true);
      setPreviewTitle(file.name || "Avatar");
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

  const fileList =
    avatarFile
      ? [
          {
            uid: "-1",
            name: avatarFile.name,
            status: "done",
            originFileObj: avatarFile,
          },
        ]
      : user?.avatar
      ? [
          {
            uid: "-1",
            name: "avatar",
            status: "done",
            url: user.avatar,
          },
        ]
      : [];

  const createdAt = user?.createdAt ? dayjs(user.createdAt).format("DD-MM-YYYY HH:mm:ss") : "-";
  const updatedAt = user?.updatedAt ? dayjs(user.updatedAt).format("DD-MM-YYYY HH:mm:ss") : "-";

  return (
    <>
      {openModal && (
        <ConfigProvider locale={enUS}>
          <ModalForm
            title={"Update User"}
            open={openModal}
            modalProps={{
              onCancel: handleReset,
              afterClose: handleReset,
              destroyOnHidden: true,
              width: 700,
              keyboard: false,
              maskClosable: false,
            }}
            scrollToFirstError
            preserve={false}
            form={form}
            onFinish={submitUser}
            submitter={{
              searchConfig: {
                submitText: changingPassword ? "Change Password" : "Save Changes",
                resetText: "Cancel",
              },
            }}
          >
            {loadingUser ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <Spin />
              </div>
            ) : (
              <>
                {user && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: "12px 16px",
                      background: "#fafafa",
                      borderRadius: 8,
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: "#888" }}>Email</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{user.email}</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: "#888" }}>Auth Provider</div>
                        <Tag color={(user.authProvider || "GOOGLE") === "LOCAL" ? "blue" : "green"}>
                          {(user.authProvider || "GOOGLE")}
                        </Tag>
                      </Col>
                      <Col span={12} style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, color: "#888" }}>Joined Date</div>
                        <div style={{ fontSize: 14 }}>{createdAt}</div>
                      </Col>
                      <Col span={12} style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, color: "#888" }}>Last Updated</div>
                        <div style={{ fontSize: 14 }}>{updatedAt}</div>
                      </Col>
                    </Row>
                  </div>
                )}

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      label="Avatar"
                      name="avatar"
                      rules={[{ required: false }]}
                      labelCol={{ span: 24 }}
                    >
                      <Upload
                        listType="picture-card"
                        className="avatar-uploader"
                        maxCount={1}
                        multiple={false}
                        beforeUpload={beforeUpload}
                        onChange={handleChange}
                        onRemove={handleRemoveAvatar}
                        onPreview={handlePreview}
                        fileList={fileList}
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
                      fieldProps={{ id: "user_fullName" }}
                      rules={[
                        { required: true, message: "Cannot be empty" },
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
                    <ProFormSelect
                      label="Gender"
                      name="gender"
                      valueEnum={{ MALE: "Male", FEMALE: "Female", OTHER: "Other" }}
                      fieldProps={{ id: "user_gender" }}
                      rules={[{ required: true, message: "Please select gender!" }]}
                      placeholder="Select gender"
                    />
                  </Col>
                  <Col span={12}>
                    <ProFormSelect
                      label="Role"
                      name="role"
                      valueEnum={{ ADMIN: "ADMIN", LEARNER: "LEARNER", STAFF: "STAFF" }}
                      fieldProps={{ id: "user_role" }}
                      rules={[{ required: true, message: "Please select role!" }]}
                      placeholder="Select role"
                    />
                  </Col>

                  <Col span={12}>
                    <ProFormSelect
                      label="Status"
                      name="isActive"
                      valueEnum={{ true: "Active", false: "Inactive" }}
                      fieldProps={{ id: "user_isActive" }}
                      rules={[{ required: true, message: "Please select status!" }]}
                      placeholder="Select status"
                    />
                  </Col>

                  {/* Đổi mật khẩu */}
                  <Col span={24}>
                    <div
                      style={{
                        marginTop: 24,
                        padding: 16,
                        borderRadius: 8,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>Change Password</span>
                        </div>
                        <Switch
                          checked={changingPassword}
                          onChange={(checked) => {
                            setChangingPassword(checked);
                            if (!checked) {
                              form.setFieldsValue({
                                newPassword: undefined,
                                confirmNewPassword: undefined,
                              });
                            }
                          }}
                          checkedChildren="On"
                          unCheckedChildren="Off"
                        />
                      </div>
                    </div>
                  </Col>

                  {changingPassword && (
                    <>
                      <Col span={12}>
                        <ProFormText.Password
                          label="New Password"
                          name="newPassword"
                          fieldProps={{ autoComplete: "new-password" }}
                          rules={[
                            {
                              validator: (_, value) => {
                                if (!value) return Promise.resolve();
                                if (!isStrongPassword(value)) {
                                  return Promise.reject(
                                    "Password must be 8-20 characters with uppercase, lowercase, number, and special character!"
                                  );
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                          placeholder="Enter new password (optional)"
                        />
                      </Col>
                      <Col span={12}>
                        <ProFormText.Password
                          label="Confirm New Password"
                          name="confirmNewPassword"
                          fieldProps={{ autoComplete: "new-password" }}
                          dependencies={["newPassword"]}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const pwd = getFieldValue("newPassword");
                                if (!pwd && !value) return Promise.resolve();
                                if (pwd && value !== pwd) {
                                  return Promise.reject("Passwords do not match!");
                                }
                                return Promise.resolve();
                              },
                            }),
                          ]}
                          placeholder="Re-enter new password"
                        />
                      </Col>
                    </>
                  )}
                </Row>
              </>
            )}
          </ModalForm>

          <ConfigProvider locale={enUS}>
            <Modal
              open={previewOpen}
              title={previewTitle}
              footer={null}
              onCancel={() => setPreviewOpen(false)}
              style={{ zIndex: 1500 }}
            >
              <img alt="avatar" style={{ width: "100%" }} src={previewImage} />
            </Modal>
          </ConfigProvider>
        </ConfigProvider>
      )}
    </>
  );
};

export default ModalUserUpdate;