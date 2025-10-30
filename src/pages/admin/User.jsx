import React, { useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchUsers } from "@/redux/slices/userSlide";
import DataTable from "@/components/admin/data-table";
import { Tag, Switch, Avatar } from "antd";
import { ProFormSelect } from "@ant-design/pro-components";
import queryString from "query-string";
import ModalUser from "@/components/admin/user/create.user.jsx";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const UserPage = () => {
  const tableRef = useRef();
  const dispatch = useAppDispatch();
  const isFetching = useAppSelector((state) => state.users.isFetching);
  const meta = useAppSelector((state) => state.users.meta);
  const users = useAppSelector((state) => state.users.result);

  const [openModal, setOpenModal] = React.useState(false);

  const reloadTable = () => {
    if (tableRef.current) {
      tableRef.current.reload();
    }
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (text, record, index) => <>{index + 1 + meta.page * meta.pageSize}</>,
      hideInSearch: true,
    },
    {
      title: "Avatar",
      dataIndex: "avatar",
      render: (text, record) => (
        <Avatar src={record.avatar} size={40}>
          {record.fullName?.[0] || "-"}
        </Avatar>
      ),
      width: 80,
      align: "center",
      hideInSearch: true,
    },
    {
      title: "Họ tên",
      dataIndex: "fullName",
      sorter: true,
      width: 200,
      hideInSearch: true,
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 240,
      sorter: true,
    },
    {
      title: "Role",
      dataIndex: "role",
      width: 140,
      renderFormItem: () => (
        <ProFormSelect
          showSearch
          mode="single"
          allowClear
          valueEnum={{
            ADMIN: "ADMIN",
            LEARNER: "LEARNER",
            STAFF: "STAFF",
          }}
          placeholder="Chọn role"
        />
      ),
      render: (val) => (
        <Tag color={val === "ADMIN" ? "volcano" : val === "STAFF" ? "purple" : "geekblue"}>{val}</Tag>
      ),
      sorter: true,
    },
    {
      title: "Kích hoạt",
      dataIndex: "isActive",
      align: "center",
      width: 130,
      renderFormItem: () => (
        <ProFormSelect
          mode="single"
          allowClear
          valueEnum={{
            true: "Hoạt động",
            false: "Khoá",
          }}
          placeholder="Trạng thái"
        />
      ),
      render: (val) => (
        <Switch checked={val} disabled checkedChildren="Hoạt động" unCheckedChildren="Khoá" />
      ),
      sorter: true,
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      width: 200,
      sorter: true,
      hideInSearch: true,
    },
  ];

  const buildQuery = (params, sort) => {
    const clone = { ...params };
    const q = {
      page: clone.current - 1,
      size: clone.pageSize,
    };

    if (clone.email) {
      q.email = clone.email;
    }
    if (clone.role) {
      q.role = clone.role;
    }
    if (clone.isActive !== undefined && clone.isActive !== null && clone.isActive !== "") {
      q.isActive = clone.isActive;
    }

    let temp = queryString.stringify(q);

    let sortBy = "";
    let direction = "DESC";

    if (sort?.email) {
      sortBy = "email";
      direction = sort.email === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.role) {
      sortBy = "role";
      direction = sort.role === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.isActive) {
      sortBy = "isActive";
      direction = sort.isActive === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.fullName) {
      sortBy = "fullName";
      direction = sort.fullName === "ascend" ? "ASC" : "DESC";
    }
    if (sort?.updatedAt) {
      sortBy = "updatedAt";
      direction = sort.updatedAt === "ascend" ? "ASC" : "DESC";
    }

    if (!sortBy) {
      sortBy = "updatedAt";
      direction = "DESC";
    }

    temp = `${temp}&sortBy=${sortBy}&direction=${direction}`;
    return temp;
  };

  return (
    <div>
      <DataTable
        actionRef={tableRef}
        headerTitle="Quản lý User"
        rowKey="userId"
        loading={isFetching}
        columns={columns}
        dataSource={users}
        request={async (params, sort) => {
          const query = buildQuery(params, sort);
          await dispatch(fetchUsers({ query }));
        }}
        pagination={{
          current: meta.page + 1,
          pageSize: meta.pageSize,
          total: meta.total,
          showSizeChanger: true,
          showTotal: (total, range) => (
            <div>{range[0]}-{range[1]} trên {total} rows</div>
          )
        }}
        scroll={{ x: true }}
        rowSelection={false}
        toolBarRender={() => ([
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setOpenModal(true)}>
            Thêm mới
          </Button>
        ])}
      />
      <ModalUser
        openModal={openModal}
        setOpenModal={setOpenModal}
        reloadTable={reloadTable}
      />
    </div>
  );
};

export default UserPage;
