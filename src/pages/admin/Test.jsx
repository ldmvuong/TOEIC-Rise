import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { BookOutlined, DeleteOutlined, EditOutlined, FundViewOutlined, PlusOutlined } from "@ant-design/icons";
import { ProFormSelect } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag } from "antd";
import dayjs from 'dayjs';
import queryString from 'query-string';
import { fetchTests } from '../../redux/slices/testSlide';
import DataTable from '../../components/admin/data-table/index';
import ImportTestModal from '../../components/admin/Test/import.test.modal';



const TestPage = () => {
    const location = useLocation();
    const tableRef = useRef();
    const formRef = useRef();
    const navigate = useNavigate();
    const [openImport, setOpenImport] = useState(false);
    const [initialParams, setInitialParams] = useState({});

    const isFetching = useAppSelector(state => state.tests.isFetching);
    const meta = useAppSelector(state => state.tests.meta);
    const tests = useAppSelector(state => state.tests.result);
    const dispatch = useAppDispatch();

    const columns = [
        {
            title: 'STT',
            key: 'index',
            width: 50,
            align: "center",
            render: (text, record, index) => (
                <>
                    {index + 1 + (meta.page * meta.pageSize)}
                </>
            ),
            hideInSearch: true,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            sorter: true,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            renderFormItem: () => (
                <ProFormSelect
                    showSearch
                    mode="single"
                    allowClear
                    valueEnum={{
                        PENDING: 'PENDING',
                        APPROVED: 'APPROVED',
                        REJECTED: 'REJECTED',
                        DELETED: 'DELETED',
                    }}
                    placeholder="Select status"
                />
            ),
            render: (dom, entity) => {
                let color = "default";
                switch (entity.status) {
                    case "PENDING":
                        color = "orange";
                        break;
                    case "APPROVED":
                        color = "green";
                        break;
                    case "REJECTED":
                        color = "red";
                        break;
                    case "DELETED":
                        color = "red";
                        break;
                    default:
                        color = "default";
                }
                return (
                    <Tag color={color}>
                        {entity.status}
                    </Tag>
                );
            },
            sorter: true,
        },
        {
            title: 'CreatedAt',
            dataIndex: 'createdAt',
            width: 200,
            sorter: true,
            render: (text, record) => (
                <>{record.createdAt ? dayjs(record.createdAt).format('DD-MM-YYYY HH:mm:ss') : ""}</>
            ),
            hideInSearch: true,
        },
        {
            title: 'UpdatedAt',
            dataIndex: 'updatedAt',
            width: 200,
            sorter: true,
            render: (text, record) => (
                <>{record.updatedAt ? dayjs(record.updatedAt).format('DD-MM-YYYY HH:mm:ss') : ""}</>
            ),
            hideInSearch: true,
        },
        {
            title: 'Actions',
            hideInSearch: true,
            width: 50,
            render: (_value, entity) => (
                <Space>

                    <FundViewOutlined
                        style={{ fontSize: 20, color: '#ffa500' }}
                        title="View details"
                        onClick={() => {
                            navigate(`/admin/tests/${entity.id}`);
                        }}
                    />
                </Space>
            ),
        },
    ];

    const buildQuery = (params, sort) => {
        const clone = { ...params };
        const q = {
            page: clone.current - 1,
            size: clone.pageSize
        };

        if (clone.name) {
            q.name = clone.name;
        }

        if (clone.status) {
            q.status = clone.status;
        }

        let temp = queryString.stringify(q);

        let sortBy = "";
        let direction = "DESC";
        
        if (sort?.name) {
            sortBy = "updatedAt";
            direction = sort.name === 'ascend' ? "ASC" : "DESC";
        }
        if (sort?.status) {
            sortBy = "updatedAt";
            direction = sort.status === 'ascend' ? "ASC" : "DESC";
        }
        if (sort?.createdAt) {
            sortBy = "createdAt";
            direction = sort.createdAt === 'ascend' ? "ASC" : "DESC";
        }
        if (sort?.updatedAt) {
            sortBy = "updatedAt";
            direction = sort.updatedAt === 'ascend' ? "ASC" : "DESC";
        }

        if (!sortBy) {
            sortBy = "updatedAt";
            direction = "DESC";
        }

        temp = `${temp}&sortBy=${sortBy}&direction=${direction}`;

        return temp;
    };

    const reloadTable = () => {
        if (tableRef.current) {
            tableRef.current.reload();
        }
    };

    return (
        <div>
            <DataTable
                actionRef={tableRef}
                formRef={formRef}
                headerTitle="Tests"
                rowKey="id"
                loading={isFetching}
                columns={columns}
                dataSource={tests}
                params={initialParams}
                request={async (params, sort, filter) => {
                    const query = buildQuery(params, sort, filter);
                    dispatch(fetchTests({ query }));
                }}
                scroll={{ x: true }}
                pagination={{
                    current: meta.page + 1,
                    pageSize: meta.pageSize,
                    showSizeChanger: true,
                    total: meta.total,
                    showTotal: (total, range) => (
                        <div>{range[0]}-{range[1]} of {total} rows</div>
                    )
                }}
                rowSelection={false}
                toolBarRender={() => ([
                        <Button
                            key="add"
                            icon={<PlusOutlined />}
                            type="primary"
                            onClick={() => setOpenImport(true)}
                        >
                            Add New
                        </Button>
                ])}
            />
            <ImportTestModal
                open={openImport}
                onClose={() => setOpenImport(false)}
                onSuccess={() => reloadTable()}
            />
            
            
        </div>
    );
};

export default TestPage;