import { useEffect, useState } from "react";
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

const StatCard = ({ title, value, icon, color }) => {
  return (
    <Card
      variant="outlined"
      hoverable
      style={{
        height: "100%",
        borderRadius: 8,
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
};

const GroupCard = ({ title, subtitle, children }) => {
  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>
            {title}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {subtitle}
          </Text>
        </Space>
      }
      variant="outlined"
      style={{
        height: "100%",
        borderRadius: 8,
      }}
    >
      <Row gutter={[16, 16]}>{children}</Row>
    </Card>
  );
};

const DashboardPage = () => {
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
        message.error("Không thể tải System Overview. Vui lòng thử lại.");
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
          {/* Nhóm A: User Ecosystem */}
          <GroupCard
            title="User Ecosystem"
            subtitle="Hệ sinh thái người dùng"
          >
              <Col xs={24} md={8}>
                <StatCard
                  title="Total Accounts"
                  value={stats?.totalAccounts || 0}
                  icon={<IdcardOutlined />}
                  color="#595959"
                />
              </Col>
              <Col xs={24} md={8}>
                <StatCard
                  title="Learners"
                  value={stats?.totalLearners || 0}
                  icon={<UserOutlined />}
                  color="#1890ff"
                />
              </Col>
              <Col xs={24} md={8}>
                <StatCard
                  title="Staff / Admins"
                  value={stats?.totalStaffs || 0}
                  icon={<SafetyCertificateOutlined />}
                  color="#722ed1"
                />
              </Col>
          </GroupCard>

          {/* Nhóm B: Content Repository */}
          <GroupCard
            title="Content Repository"
            subtitle="Kho tài nguyên"
          >
              <Col xs={24} md={8}>
                <StatCard
                  title="Test Sets"
                  value={stats?.totalTestSets || 0}
                  icon={<FolderOpenOutlined />}
                  color="#faad14"
                />
              </Col>
              <Col xs={24} md={8}>
                <StatCard
                  title="Total Tests"
                  value={stats?.totalTests || 0}
                  icon={<FileTextOutlined />}
                  color="#fa8c16"
                />
              </Col>
              <Col xs={24} md={8}>
                <StatCard
                  title="Flashcards"
                  value={stats?.totalFlashcards || 0}
                  icon={<ThunderboltOutlined />}
                  color="#52c41a"
                />
              </Col>
          </GroupCard>

          {/* Nhóm C: Lifetime Engagement */}
          <GroupCard
            title="Lifetime Engagement"
            subtitle="Tương tác trọn đời"
          >
              <Col xs={24} md={8}>
                <StatCard
                  title="Lifetime Submissions"
                  value={stats?.totalSubmissions || 0}
                  icon={<TrophyOutlined />}
                  color="#f5222d"
                />
              </Col>
              <Col xs={24} md={8}>
                <StatCard
                  title="Total AI Chats"
                  value={stats?.totalConversations || 0}
                  icon={<MessageOutlined />}
                  color="#eb2f96"
                />
              </Col>
              <Col xs={24} md={8}>
                <StatCard
                  title="Total Reports"
                  value={stats?.totalReports || 0}
                  icon={<FlagOutlined />}
                  color="#fa541c"
                />
              </Col>
          </GroupCard>
      </Space>
    </div>
  );
};

export default DashboardPage;
