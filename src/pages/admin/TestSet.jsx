import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { BookOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { ProFormSelect } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag } from "antd";
import dayjs from 'dayjs';
import queryString from 'query-string';
import { fetchTestSets } from '../../redux/slices/testsetSlide';
import { getTestInTestSet } from '../../api/api';
import DataTable from '../../components/admin/data-table/index';
import ModalTestSet from '../../components/admin/test-set/modal.testset';
import DrawerTest from '../../components/admin/drawer/drawer.test';



const TestSetPage = () => {
    const location = useLocation();
    const tableRef = useRef();
    const drawerRef = useRef();
    const formRef = useRef();
    const [openModal, setOpenModal] = useState(false);
    const [dataInit, setDataInit] = useState(null);
    const [openDrawer, setOpenDrawer] = useState(false);
    const [testData, setTestData] = useState(null);
    const [loadingDrawer, setLoadingDrawer] = useState(false);
    const [currentTestSet, setCurrentTestSet] = useState(null);
    const [initialParams, setInitialParams] = useState({});

    const isFetching = useAppSelector(state => state.testSets.isFetching);
    const meta = useAppSelector(state => state.testSets.meta);
    const testSets = useAppSelector(state => state.testSets.result);
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
                        IN_USE: 'IN_USE',
                        DELETED: 'DELETED',
                    }}
                    placeholder="Select status"
                />
            ),
            render: (dom, entity) => (
                <Tag color={entity.status === "IN_USE" ? "lime" : "red"}>
                    {entity.status}
                </Tag>
            ),
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

                    <EditOutlined
                        style={{ fontSize: 20, color: '#ffa500' }}
                        onClick={() => {
                            setOpenModal(true);
                            setDataInit(entity);
                        }}
                    />

                    <BookOutlined 
                        style={{ fontSize: 20, color: '#52c41a', cursor: 'pointer' }}
                        onClick={() => handleShowTests(entity)}
                        title="View test list"
                    />

                    {/* <Popconfirm
                        placement="leftTop"
                        title={"Confirm delete test set"}
                        description={"Are you sure you want to delete this test set?"}
                        // onConfirm={() => handleDeleteTestSet(entity.id)}
                        okText="Confirm"
                        cancelText="Cancel"
                    >
                        <span style={{ cursor: "pointer", margin: "0 10px" }}>
                            <DeleteOutlined
                                style={{ fontSize: 20, color: '#ff4d4f' }}
                            />
                        </span>
                    </Popconfirm> */}
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

    const handleShowTests = async (testSet) => {
        setLoadingDrawer(true);
        setOpenDrawer(true);
        setTestData(null);
        setCurrentTestSet(testSet);
        
        try {
            // Gọi API với query parameters mặc định
            const query = 'page=0&size=10&sortBy=updatedAt&direction=DESC';
            const response = await getTestInTestSet(testSet.id, query);
            setTestData(response.data);
        } catch (error) {
            // Silent error handling
        } finally {
            setLoadingDrawer(false);
        }
    };

    const handleFetchTests = async (query) => {
        if (!currentTestSet) return;
        
        setLoadingDrawer(true);
        try {
            const response = await getTestInTestSet(currentTestSet.id, query);
            setTestData(response.data);
            
            // Cập nhật currentTestSet từ response data nếu có thông tin test set mới
            if (response.data && (response.data.name || response.data.status)) {
                setCurrentTestSet(prev => ({
                    ...prev,
                    name: response.data.name || prev.name,
                    status: response.data.status || prev.status,
                    createdAt: response.data.createdAt || prev.createdAt,
                    updatedAt: response.data.updatedAt || prev.updatedAt
                }));
            }
        } catch (error) {
            // Silent error handling
        } finally {
            setLoadingDrawer(false);
        }
    };

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
        setTestData(null);
        setCurrentTestSet(null);
    };

    const reloadDrawer = async () => {
        if (openDrawer && currentTestSet) {
            // Cập nhật thông tin test set từ table data (đã được reload bởi reloadTable)
            const updatedTestSet = testSets.find(ts => ts.id === currentTestSet.id);
            if (updatedTestSet) {
                setCurrentTestSet(updatedTestSet);
            }
            
            // Reload danh sách test với query hiện tại (giữ nguyên filter/pagination)
            // Điều này sẽ tự động cập nhật testData và currentTestSet từ response
            if (drawerRef.current && drawerRef.current.reload) {
                drawerRef.current.reload();
            }
        }
    };

    return (
        <div>
            <DataTable
                actionRef={tableRef}
                formRef={formRef}
                headerTitle="Test Sets"
                rowKey="id"
                loading={isFetching}
                columns={columns}
                dataSource={testSets}
                params={initialParams}
                request={async (params, sort, filter) => {
                    const query = buildQuery(params, sort, filter);
                    dispatch(fetchTestSets({ query }));
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
                toolBarRender={() => (
                        <Button
                            icon={<PlusOutlined />}
                            type="primary"
                            onClick={() => setOpenModal(true)}
                        >
                            Add New
                        </Button>
                )}
            />
            
            <ModalTestSet
                openModal={openModal}
                setOpenModal={setOpenModal}
                reloadTable={reloadTable}
                dataInit={dataInit}
                setDataInit={setDataInit}
                onUpdateSuccess={reloadDrawer}
            />

            <DrawerTest
                ref={drawerRef}
                open={openDrawer}
                onClose={handleCloseDrawer}
                testData={testData}
                loading={loadingDrawer}
                testSetName={currentTestSet?.name}
                testSetId={currentTestSet?.id}
                onFetchTests={handleFetchTests}
                onEditTestSet={() => {
                    if (currentTestSet) {
                        setOpenModal(true);
                        setDataInit(currentTestSet);
                    }
                }}
            />
        </div>
    );
};

export default TestSetPage;