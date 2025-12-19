import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Space,
  Skeleton,
  message,
  Divider,
  Tooltip,
} from "antd";
import {
  IdcardOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  MessageOutlined,
  FlagOutlined,
} from "@ant-design/icons";
import CountUp from "react-countup";
import * as apiModule from "../../api/api";
const { getDashboardStatistics } = apiModule;

const { Title, Text } = Typography;

const formatter = (value) => (
  <CountUp end={Number(value || 0)} separator="," duration={1.5} />
);

const StatCard = ({ title, value, icon, color, onClick, tooltip }) => {
  const cardContent = (
    <Card
      variant="outlined"
      hoverable
      onClick={onClick}
      style={{
        height: "100%",
        borderRadius: 8,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <Statistic
        title={
          <Space>
            <span style={{ color: color, fontSize: 20 }}>{icon}</span>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {title}
            </Text>
          </Space>
        }
        value={value}
        formatter={formatter}
        valueStyle={{
          color: color,
          fontSize: 28,
          fontWeight: 600,
          marginTop: 8,
        }}
      />
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip}>
        {cardContent}
      </Tooltip>
    );
  }

  return cardContent;
};


const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getDashboardStatistics();
        setStats(res?.data || {});
      } catch (error) {
        console.error(error);
        message.error("Failed to load System Overview. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Hàng 1: User Ecosystem */}
        <div>
          <Title level={4} style={{ marginBottom: 16, fontSize: 18 }}>
            User Ecosystem
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Total Accounts"
                value={stats?.totalAccounts || 0}
                icon={<IdcardOutlined />}
                color="#595959"
                onClick={() => navigate("/admin/users")}
                tooltip="Click to view all users"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Learners"
                value={stats?.totalLearners || 0}
                icon={<UserOutlined />}
                color="#1890ff"
                onClick={() => navigate("/admin/users?role=LEARNER")}
                tooltip="Click to view learners"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Staff / Admins"
                value={stats?.totalStaffs || 0}
                icon={<SafetyCertificateOutlined />}
                color="#722ed1"
                onClick={() => navigate("/admin/users?role=STAFF")}
                tooltip="Click to view staff and admins"
              />
            </Col>
          </Row>
        </div>

        {/* Hàng 2: Content Repository */}
        <div>
          <Title level={4} style={{ marginBottom: 16, fontSize: 18 }}>
            Content Repository
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Test Sets"
                value={stats?.totalTestSets || 0}
                icon={<FolderOpenOutlined />}
                color="#faad14"
                onClick={() => navigate("/admin/test-sets")}
                tooltip="Click to view test sets"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Total Tests"
                value={stats?.totalTests || 0}
                icon={<FileTextOutlined />}
                color="#fa8c16"
                onClick={() => navigate("/admin/tests")}
                tooltip="Click to view tests"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Flashcards"
                value={stats?.totalFlashcards || 0}
                icon={<ThunderboltOutlined />}
                color="#52c41a"
              />
            </Col>
          </Row>
        </div>

        {/* Hàng 3: Lifetime Engagement */}
        <div>
          <Title level={4} style={{ marginBottom: 16, fontSize: 18 }}>
            Lifetime Engagement
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Lifetime Submissions"
                value={stats?.totalSubmissions || 0}
                icon={<TrophyOutlined />}
                color="#f5222d"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Total AI Chats"
                value={stats?.totalConversations || 0}
                icon={<MessageOutlined />}
                color="#eb2f96"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                title="Total Reports"
                value={stats?.totalReports || 0}
                icon={<FlagOutlined />}
                color="#fa541c"
                onClick={() => navigate("/admin/reports")}
                tooltip="Click to view reports"
              />
            </Col>
          </Row>
        </div>
      </Space>
    </div>
  );
};

export default DashboardPage;
