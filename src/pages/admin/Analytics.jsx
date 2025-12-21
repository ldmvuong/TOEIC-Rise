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
  DatePicker,
  Select,
  Button,
} from "antd";
import {
  UserAddOutlined,
  UserOutlined,
  FileTextOutlined,
  MessageOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import CountUp from "react-countup";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getAnalytics } from "@/api/api";
import {
  formatDateForAPI,
  formatDateForDisplay,
  getPresetDates,
  getPresetOptions,
  detectPresetFromDateRange,
  getDefaultDateRange,
  prepareChartData,
  prepareYAxisConfig,
} from "@/utils/dateUtils";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// KPI Card Component
const KPICard = ({ title, value, growthPercentage, icon, color }) => {
  // Xử lý logic hiển thị growth percentage
  const isPositive = growthPercentage > 0;
  const isNegative = growthPercentage < 0;
  const isZero = growthPercentage === 0;
  
  // Màu sắc: xanh cho tăng, đỏ cho giảm, xám cho không đổi
  const growthColor = isPositive ? "#52c41a" : isNegative ? "#ff4d4f" : "#8c8c8c";

  return (
    <Card
      hoverable
      style={{
        height: "100%",
        borderRadius: 12,
        border: "1px solid #e8e8e8",
      }}
    >
      <Statistic
        title={
          <Space>
            <span style={{ color, fontSize: 20 }}>{icon}</span>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {title}
            </Text>
          </Space>
        }
        value={value}
        formatter={(val) => (
          <CountUp end={Number(val || 0)} separator="," duration={1.5} />
        )}
        valueStyle={{
          color,
          fontSize: 28,
          fontWeight: 600,
          marginTop: 8,
        }}
        suffix={
          growthPercentage !== undefined && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: growthColor,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isPositive && (
                <>
                  <ArrowUpOutlined style={{ fontSize: 12 }} />
                  <span>+{Math.abs(growthPercentage).toFixed(1)}%</span>
                </>
              )}
              {isNegative && (
                <>
                  <ArrowDownOutlined style={{ fontSize: 12 }} />
                  <span>-{Math.abs(growthPercentage).toFixed(1)}%</span>
                </>
              )}
              {isZero && (
                <span>{growthPercentage.toFixed(1)}%</span>
              )}
            </div>
          )
        }
      />
    </Card>
  );
};

// Colors for charts
const CHART_COLORS = {
  primary: "#1890ff",
  secondary: "#52c41a",
  accent: "#faad14",
  danger: "#ff4d4f",
  purple: "#722ed1",
  orange: "#fa8c16",
};

// Empty Chart Component
const EmptyChart = () => {
  return (
    <div
      style={{
        height: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#bfbfbf",
      }}
    >
      <BarChartOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
      <Text type="secondary" style={{ fontSize: 14, opacity: 0.6 }}>
        No data available
      </Text>
    </div>
  );
};

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [preset, setPreset] = useState("30 ngày qua");

  // Fetch analytics data
  const fetchAnalytics = async (from, to) => {
    try {
      setLoading(true);
      const response = await getAnalytics(
        formatDateForAPI(from),
        formatDateForAPI(to)
      );
      setData(response?.data || null);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      message.error("Không thể tải dữ liệu phân tích. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      fetchAnalytics(dateRange[0], dateRange[1]);
    }
  }, [dateRange]);

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
      const detectedPreset = detectPresetFromDateRange(dates);
      setPreset(detectedPreset);
    }
  };

  const handlePresetChange = (value) => {
    setPreset(value);
    if (value !== "Tùy chỉnh") {
      const dates = getPresetDates(value);
      setDateRange(dates);
    }
  };

  // Prepare activity trend data với logic tự động điều chỉnh labels
  const chartConfig = data?.activityTrend?.points && dateRange && dateRange[0] && dateRange[1]
    ? prepareChartData(data.activityTrend.points, dateRange[0], dateRange[1])
    : { data: [], interval: 0, tickFormatter: null };
  
  const activityData = chartConfig.data;

  // Prepare YAxis config cho Activity Trend chart
  const yAxisConfig = prepareYAxisConfig(activityData, "submissions", 6);

  // Prepare test mode data for pie chart
  const testModeData = data?.deepInsights?.testMode
    ? [
        {
          name: "Full Test",
          value: data.deepInsights.testMode.fullTest || 0,
        },
        {
          name: "Practice",
          value: data.deepInsights.testMode.pratice || 0,
        },
      ]
    : [];

  // Check if test mode has any data
  const hasTestModeData = testModeData.length > 0 && testModeData.some((item) => item.value > 0);

  // Prepare registration source data for donut chart
  const regSourceData = data?.deepInsights?.regSource
    ? [
        {
          name: "Email",
          value: data.deepInsights.regSource.email || 0,
        },
        {
          name: "Google",
          value: data.deepInsights.regSource.google || 0,
        },
      ]
    : [];

  // Check if registration source has any data
  const hasRegSourceData = regSourceData.length > 0 && regSourceData.some((item) => item.value > 0);

  // Prepare score distribution data for histogram
  const scoreDistData = data?.deepInsights?.scoreDist
    ? [
        {
          name: "0-200",
          value: data.deepInsights.scoreDist.brand0_200 || 0,
        },
        {
          name: "200-450",
          value: data.deepInsights.scoreDist.brand200_450 || 0,
        },
        {
          name: "450-750",
          value: data.deepInsights.scoreDist.brand450_750 || 0,
        },
        {
          name: "750-990",
          value: data.deepInsights.scoreDist.brand750_990 || 0,
        },
      ]
    : [];

  // Colors for each score range
  const scoreDistColors = [
    CHART_COLORS.danger,    // 0-200: red
    CHART_COLORS.orange,     // 200-450: orange
    CHART_COLORS.accent,     // 450-750: yellow/gold
    CHART_COLORS.secondary,  // 750-990: green
  ];

  // Check if score distribution has any data
  const hasScoreDistData = scoreDistData.length > 0 && scoreDistData.some((item) => item.value > 0);

  if (loading && !data) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Header with Title and Date Range Picker */}
        <Card
          style={{
            borderRadius: 12,
            border: "1px solid #e8e8e8",
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0, fontSize: 24 }}>
                Analytics
              </Title>
            </Col>
            <Col>
              <Space>
                <Select
                  value={preset}
                  onChange={handlePresetChange}
                  style={{ width: 150 }}
                  options={getPresetOptions()}
                />
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  format="DD/MM/YYYY"
                  style={{ width: 300 }}
                  allowClear={false}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Row 1: Growth KPIs */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="New Learners"
              value={data?.newLearners?.value || 0}
              growthPercentage={data?.newLearners?.growthPercentage}
              icon={<UserAddOutlined />}
              color={CHART_COLORS.primary}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="Active Users"
              value={data?.activeUsers?.value || 0}
              growthPercentage={data?.activeUsers?.growthPercentage}
              icon={<UserOutlined />}
              color={CHART_COLORS.secondary}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="Tests Taken"
              value={data?.totalTests?.value || 0}
              growthPercentage={data?.totalTests?.growthPercentage}
              icon={<FileTextOutlined />}
              color={CHART_COLORS.accent}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KPICard
              title="AI Conversations"
              value={data?.aiConversations?.value || 0}
              growthPercentage={data?.aiConversations?.growthPercentage}
              icon={<MessageOutlined />}
              color={CHART_COLORS.purple}
            />
          </Col>
        </Row>

        {/* Row 2: Activity Trend - Area Chart */}
        <Card
          title={
            <Title level={4} style={{ margin: 0, fontSize: 18 }}>
              Activity Trend
            </Title>
          }
          style={{
            borderRadius: 12,
            border: "1px solid #e8e8e8",
          }}
        >
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#666" }}
                stroke="#d9d9d9"
                interval={0}
                tickFormatter={chartConfig.tickFormatter || ((value) => {
                  // Tìm dateLabel tương ứng trong data
                  // value là date gốc, cần tìm dateLabel đã format
                  const dataPoint = activityData.find((d) => d.date === value || d.dateRaw === value);
                  if (dataPoint && dataPoint.dateLabel && dataPoint.dateLabel !== "") {
                    return dataPoint.dateLabel;
                  }
                  return "";
                })}
                angle={activityData.length > 10 ? -45 : 0}
                textAnchor={activityData.length > 10 ? "end" : "middle"}
                height={activityData.length > 10 ? 80 : 30}
              />
              <YAxis
                domain={yAxisConfig.domain}
                ticks={yAxisConfig.ticks}
                tick={{ fontSize: 12, fill: "#666" }}
                tickFormatter={yAxisConfig.tickFormatter}
                stroke="#d9d9d9"
                width={60}
                allowDecimals={false}
                label={{
                  value: "Submissions",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: "#666", fontSize: 12 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e8e8e8",
                  borderRadius: 8,
                }}
                formatter={(value, name) => null}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0] && payload[0].payload?.dateRaw) {
                    const date = dayjs(payload[0].payload.dateRaw);
                    const submissions = payload[0].value || 0;
                    return `Date: ${date.format("DD/MM/YYYY")} - Submissions: ${submissions}`;
                  }
                  return `Date: ${label}`;
                }}
              />
              <Area
                type="monotone"
                dataKey="submissions"
                stroke={CHART_COLORS.primary}
                fillOpacity={1}
                fill="url(#colorSubmissions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Row 3: Deep Insights - 3 Charts */}
        <Row gutter={[16, 16]}>
          {/* Test Mode - Pie Chart */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Text strong style={{ fontSize: 16 }}>
                  Test Mode
                </Text>
              }
              style={{
                borderRadius: 12,
                border: "1px solid #e8e8e8",
                height: "100%",
              }}
            >
              {hasTestModeData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={testModeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {testModeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0 ? CHART_COLORS.primary : CHART_COLORS.accent
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e8e8e8",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Card>
          </Col>

          {/* Registration Source - Donut Chart */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Text strong style={{ fontSize: 16 }}>
                  Registration Source
                </Text>
              }
              style={{
                borderRadius: 12,
                border: "1px solid #e8e8e8",
                height: "100%",
              }}
            >
              {hasRegSourceData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={regSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {regSourceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0 ? CHART_COLORS.secondary : CHART_COLORS.orange
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e8e8e8",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Card>
          </Col>

          {/* Score Distribution - Histogram */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Text strong style={{ fontSize: 16 }}>
                  Score Distribution
                </Text>
              }
              style={{
                borderRadius: 12,
                border: "1px solid #e8e8e8",
                height: "100%",
              }}
            >
              {hasScoreDistData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreDistData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#666" }}
                      stroke="#d9d9d9"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#666" }}
                      stroke="#d9d9d9"
                    />
                    <Tooltip
                      formatter={(value) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e8e8e8",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[8, 8, 0, 0]}
                    >
                      {scoreDistData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={scoreDistColors[index] || CHART_COLORS.purple}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default AnalyticsPage;

