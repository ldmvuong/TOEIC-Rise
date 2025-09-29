import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'antd';
import { useAppSelector } from '../../redux/hooks';
import { setRefreshTokenAction } from '../../redux/slices/accountSlide';
import { useAppDispatch } from '../../redux/hooks';

const RefreshTokenHandler = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isRefreshToken, errorRefreshToken } = useAppSelector(state => state.account);

  const handleOk = () => {
    dispatch(setRefreshTokenAction({ status: false, message: '' }));
    navigate('/auth');
  };

  const handleCancel = () => {
    dispatch(setRefreshTokenAction({ status: false, message: '' }));
    navigate('/auth');
  };

  return (
    <Modal
      title="Phiên đăng nhập hết hạn"
      open={isRefreshToken}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={[
        <Button key="ok" type="primary" onClick={handleOk}>
          Đăng nhập lại
        </Button>
      ]}
      closable={false}
      maskClosable={false}
    >
      <p>{errorRefreshToken}</p>
      <p>Vui lòng đăng nhập lại để tiếp tục sử dụng.</p>
    </Modal>
  );
};

export default RefreshTokenHandler;
