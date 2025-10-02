import React, { useState, useEffect } from 'react';
import { 
    Drawer, List, Avatar, Spin, Empty, Tag, Card, Statistic, Row, Col, 
    Input, Select, Pagination, Button, Space, Form 
} from 'antd';
import { 
    FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, 
    SearchOutlined, ReloadOutlined, CloseCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

const DrawerTest = ({ open, onClose, testData, loading, testSetName, onFetchTests }) => {
    const [searchForm] = Form.useForm();
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchName, setSearchName] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
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
                return 'Chờ duyệt';
            case 'APPROVED':
                return 'Đã duyệt';
            case 'REJECTED':
                return 'Từ chối';
            case 'DELETED':
                return 'Đã xóa';
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
            return `Không tìm thấy test nào có tên chứa "${searchName}" với trạng thái "${getStatusText(searchStatus)}"`;
        } else if (searchName) {
            return `Không tìm thấy test nào có tên chứa "${searchName}"`;
        } else if (searchStatus) {
            return `Không có test nào với trạng thái "${getStatusText(searchStatus)}"`;
        } else {
            return "Không có test nào trong test set này";
        }
    };

    return (
        <Drawer
            title={`Danh sách Test - ${testSetName || 'Test Set'}`}
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
                    {/* Thông tin Test Set */}
                    <Card title="Thông tin Test Set" style={{ marginBottom: 16 }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <p><strong>Tên:</strong> {testData.name}</p>
                                <p><strong>Trạng thái:</strong> 
                                    <Tag color={getStatusColor(testData.status)} style={{ marginLeft: 8 }}>
                                        {getStatusText(testData.status)}
                                    </Tag>
                                </p>
                            </Col>
                            <Col span={12}>
                                <p><strong>Ngày tạo:</strong> {testData.createdAt ? dayjs(testData.createdAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</p>
                                <p><strong>Cập nhật cuối:</strong> {testData.updatedAt ? dayjs(testData.updatedAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</p>
                            </Col>
                        </Row>
                    </Card>

                    {/* Form tìm kiếm */}
                    <Card title="Tìm kiếm và Lọc" style={{ marginBottom: 16 }}>
                        <Form form={searchForm} layout="inline">
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="name" style={{ flex: 1 }}>
                                    <Search
                                        placeholder="Tìm kiếm theo tên test..."
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        onSearch={handleSearch}
                                        enterButton={<SearchOutlined />}
                                        allowClear
                                    />
                                </Form.Item>
                                <Form.Item name="status" style={{ width: 150 }}>
                                    <Select
                                        placeholder="Trạng thái"
                                        value={searchStatus}
                                        onChange={setSearchStatus}
                                        allowClear
                                    >
                                        <Option value="PENDING">Chờ duyệt</Option>
                                        <Option value="APPROVED">Đã duyệt</Option>
                                        <Option value="REJECTED">Từ chối</Option>
                                        <Option value="DELETED">Đã xóa</Option>
                                    </Select>
                                </Form.Item>
                                <Button 
                                    type="primary" 
                                    onClick={handleSearch}
                                    icon={<SearchOutlined />}
                                >
                                    Tìm kiếm
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

                    {/* Thống kê tổng quan */}
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Tổng số test"
                                    value={testData.testResponses?.meta?.total || 0}
                                    prefix={<FileTextOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Chờ duyệt"
                                    value={testData.testResponses?.result?.filter(test => test.status === 'PENDING').length || 0}
                                    valueStyle={{ color: '#faad14' }}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Đã duyệt"
                                    value={testData.testResponses?.result?.filter(test => test.status === 'APPROVED').length || 0}
                                    valueStyle={{ color: '#52c41a' }}
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Từ chối"
                                    value={testData.testResponses?.result?.filter(test => test.status === 'REJECTED').length || 0}
                                    valueStyle={{ color: '#ff4d4f' }}
                                    prefix={<CloseCircleOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>

                    

                    {/* Danh sách test */}
                    {testData.testResponses?.result && testData.testResponses.result.length > 0 ? (
                        <Card 
                            title={`Danh sách Test (${testData.testResponses.meta?.total || 0} kết quả)`}
                            extra={
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    Trang {currentPage} / {testData.testResponses.meta?.pages || 1}
                                </div>
                            }
                        >
                            <List
                                itemLayout="horizontal"
                                dataSource={testData.testResponses.result}
                                renderItem={(test) => (
                                    <List.Item>
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
                                                    <div><strong>Ngày tạo:</strong> {test.createdAt ? dayjs(test.createdAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</div>
                                                    <div><strong>Cập nhật cuối:</strong> {test.updatedAt ? dayjs(test.updatedAt).format('DD-MM-YYYY HH:mm:ss') : 'N/A'}</div>
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
                                        `${range[0]}-${range[1]} của ${total} test`
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
                    description="Đang tải dữ liệu test set..." 
                    style={{ marginTop: 50 }}
                />
            )}
        </Drawer>
    );
};

export default DrawerTest;