import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Drawer, List, Avatar, Spin, Empty, Tag, Card, Statistic, Row, Col, 
    Input, Select, Pagination, Button, Space, Form 
} from 'antd';
import { 
    FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, 
    SearchOutlined, ReloadOutlined, CloseCircleOutlined, EditOutlined, EyeOutlined, PlusOutlined, DeleteOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ImportTestModal from '../Test/import.test.modal';

const { Search } = Input;
const { Option } = Select;

const DrawerTest = forwardRef(({ open, onClose, testData, loading, testSetName, onFetchTests, onEditTestSet, testSetId }, ref) => {
    const navigate = useNavigate();
    const [searchForm] = Form.useForm();
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchName, setSearchName] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [openImportModal, setOpenImportModal] = useState(false);

    // Build query string
    const buildQuery = (page, size, name, status) => {
        let query = `page=${page - 1}&size=${size}&sortBy=updatedAt&direction=DESC`;
        
        if (name) {
            query += `&name=${encodeURIComponent(name)}`;
        }
        
        if (status) {
            query += `&status=${status}`;
        }
        
        return query;
    };

    // Expose reload function to parent
    useImperativeHandle(ref, () => ({
        reload: () => {
            if (onFetchTests) {
                const query = buildQuery(currentPage, pageSize, searchName, searchStatus);
                onFetchTests(query);
            }
        }
    }), [currentPage, pageSize, searchName, searchStatus, onFetchTests]);
    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
                return 'orange';
            case 'APPROVED':
                return 'green';
            case 'REJECTED':
                return 'red';
            case 'DELETED':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PENDING':
                return <ClockCircleOutlined style={{ color: '#faad14' }} />;
            case 'APPROVED':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'REJECTED':
                return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
            case 'DELETED':
                return <CloseCircleOutlined style={{ color: '#8c8c8c' }} />;
            default:
                return <FileTextOutlined />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'PENDING':
                return 'Pending';
            case 'APPROVED':
                return 'Approved';
            case 'REJECTED':
                return 'Rejected';
            case 'DELETED':
                return 'Deleted';
            default:
                return status;
        }
    };

    // Reset form khi drawer mở/đóng
    useEffect(() => {
        if (open) {
            setCurrentPage(1);
            setPageSize(10);
            setSearchName('');
            setSearchStatus('');
            searchForm.resetFields();
        }
    }, [open, searchForm]);

    // Handle search
    const handleSearch = () => {
        setCurrentPage(1);
        if (onFetchTests) {
            const query = buildQuery(1, pageSize, searchName, searchStatus);
            onFetchTests(query);
        }
    };

    // Handle pagination
    const handlePageChange = (page, size) => {
        setCurrentPage(page);
        setPageSize(size);
        if (onFetchTests) {
            const query = buildQuery(page, size, searchName, searchStatus);
            onFetchTests(query);
        }
    };

    // Handle reset
    const handleReset = () => {
        setSearchName('');
        setSearchStatus('');
        setCurrentPage(1);
        searchForm.resetFields();
        if (onFetchTests) {
            const query = buildQuery(1, pageSize, '', '');
            onFetchTests(query);
        }
    };

    const getEmptyDescription = () => {
        if (searchName && searchStatus) {
            return `No tests found with name containing "${searchName}" and status "${getStatusText(searchStatus)}"`;
        } else if (searchName) {
            return `No tests found with name containing "${searchName}"`;
        } else if (searchStatus) {
            return `No tests with status "${getStatusText(searchStatus)}"`;
        } else {
            return "No tests in this test set";
        }
    };

    return (
        <Drawer
            title={`Test List - ${testSetName || 'Test Set'}`}
            placement="right"
            onClose={onClose}
            open={open}
            width={800}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" />
                </div>
            ) : testData ? (
                <div>
                    {/* Test Set Information */}
                    <Card 
                        title="Test Set Information" 
                        style={{ marginBottom: 16 }}
                        extra={
                            <Space>
                                {testSetId && (
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setOpenImportModal(true)}
                                        title="Import test"
                                    >
                                        Import Test
                                    </Button>
                                )}
                                {onEditTestSet && (
                                    <Button
                                        type="primary"
                                        icon={<EditOutlined />}
                                        onClick={onEditTestSet}
                                        shape="circle"
                                    />
                                )}
                            </Space>
                        }
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <p><strong>Name:</strong> {testData.name}</p>
                                <p><strong>Status:</strong> 
                                    <Tag color={getStatusColor(testData.status)} style={{ marginLeft: 8 }}>
                                        {getStatusText(testData.status)}
                                    </Tag>
                                </p>
                            </Col>
                            <Col span={12}>
                                <p><strong>Created At:</strong> {testData.createdAt ? dayjs(testData.createdAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</p>
                                <p><strong>Last Updated:</strong> {testData.updatedAt ? dayjs(testData.updatedAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</p>
                            </Col>
                        </Row>
                    </Card>

                    {/* Search Form */}
                    <Card title="Search and Filter" style={{ marginBottom: 16 }}>
                        <Form form={searchForm} layout="inline">
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="name" style={{ flex: 1 }}>
                                    <Search
                                        placeholder="Search by test name..."
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        onSearch={handleSearch}
                                        enterButton={<SearchOutlined />}
                                        allowClear
                                    />
                                </Form.Item>
                                <Form.Item name="status" style={{ width: 150 }}>
                                    <Select
                                        placeholder="Status"
                                        value={searchStatus}
                                        onChange={setSearchStatus}
                                        allowClear
                                    >
                                        <Option value="PENDING">Pending</Option>
                                        <Option value="APPROVED">Approved</Option>
                                        <Option value="REJECTED">Rejected</Option>
                                        <Option value="DELETED">Deleted</Option>
                                    </Select>
                                </Form.Item>
                                <Button 
                                    type="primary" 
                                    onClick={handleSearch}
                                    icon={<SearchOutlined />}
                                >
                                    Search
                                </Button>
                                <Button 
                                    onClick={handleReset}
                                    icon={<ReloadOutlined />}
                                >
                                    Reset
                                </Button>
                            </Space.Compact>
                        </Form>
                    </Card>

                    {/* Statistics Overview */}
                    <Row gutter={16} style={{ marginBottom: 24, display: 'flex' }}>
                        <Col flex={1}>
                            <Card style={{ width: '100%' }}>
                                <Statistic
                                    title="Total Tests"
                                    value={testData.testResponses?.meta?.total || 0}
                                    prefix={<FileTextOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col flex={1}>
                            <Card style={{ width: '100%' }}>
                                <Statistic
                                    title="Pending"
                                    value={testData.testResponses?.result?.filter(test => test.status === 'PENDING').length || 0}
                                    valueStyle={{ color: '#faad14' }}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col flex={1}>
                            <Card style={{ width: '100%' }}>
                                <Statistic
                                    title="Approved"
                                    value={testData.testResponses?.result?.filter(test => test.status === 'APPROVED').length || 0}
                                    valueStyle={{ color: '#52c41a' }}
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col flex={1}>
                            <Card style={{ width: '100%' }}>
                                <Statistic
                                    title="Rejected"
                                    value={testData.testResponses?.result?.filter(test => test.status === 'REJECTED').length || 0}
                                    valueStyle={{ color: '#ff4d4f' }}
                                    prefix={<CloseCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col flex={1}>
                            <Card style={{ width: '100%' }}>
                                <Statistic
                                    title="Delete"
                                    value={testData.testResponses?.result?.filter(test => test.status === 'DELETED').length || 0}
                                    valueStyle={{ color: '#ff4d4f' }}
                                    prefix={<DeleteOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>

                    

                    {/* Test List */}
                    {testData.testResponses?.result && testData.testResponses.result.length > 0 ? (
                        <Card 
                            title={`Test List (${testData.testResponses.meta?.total || 0} results)`}
                            extra={
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    Page {currentPage} / {testData.testResponses.meta?.pages || 1}
                                </div>
                            }
                        >
                            <List
                                itemLayout="horizontal"
                                dataSource={testData.testResponses.result}
                                renderItem={(test) => (
                                    <List.Item
                                        actions={[
                                            <Button
                                                key="view"
                                                type="text"
                                                icon={<EyeOutlined />}
                                                onClick={() => navigate(`/admin/tests/${test.id}`)}
                                                title="View test details"
                                            />
                                        ]}
                                    >
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar 
                                                    icon={getStatusIcon(test.status)} 
                                                    style={{ backgroundColor: '#f0f0f0', color: '#666' }}
                                                />
                                            }
                                            title={
                                                <div>
                                                    {test.name}
                                                    <Tag color={getStatusColor(test.status)} style={{ marginLeft: 8 }}>
                                                        {getStatusText(test.status)}
                                                    </Tag>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <div><strong>ID:</strong> {test.id}</div>
                                                    <div><strong>Created At:</strong> {test.createdAt ? dayjs(test.createdAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</div>
                                                    <div><strong>Last Updated:</strong> {test.updatedAt ? dayjs(test.updatedAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</div>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                            
                            {/* Phân trang */}
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <Pagination
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={testData.testResponses.meta?.total || 0}
                                    showSizeChanger
                                    showQuickJumper
                                    showTotal={(total, range) => 
                                        `${range[0]}-${range[1]} of ${total} tests`
                                    }
                                    pageSizeOptions={['5', '10']}
                                    onChange={handlePageChange}
                                    onShowSizeChange={handlePageChange}
                                />
                            </div>
                        </Card>
                    ) : (
                        <Empty 
                            description={getEmptyDescription()} 
                            style={{ marginTop: 50 }}
                        />
                    )}
                </div>
            ) : (
                <Empty 
                    description="Loading test set data..." 
                    style={{ marginTop: 50 }}
                />
            )}
            
            <ImportTestModal
                open={openImportModal}
                onClose={() => setOpenImportModal(false)}
                onSuccess={() => {
                    // Reload danh sách test sau khi import thành công
                    if (onFetchTests) {
                        const query = buildQuery(currentPage, pageSize, searchName, searchStatus);
                        onFetchTests(query);
                    }
                }}
                defaultTestSetId={testSetId}
                defaultTestSetName={testSetName}
            />
        </Drawer>
    );
});

DrawerTest.displayName = 'DrawerTest';

export default DrawerTest;