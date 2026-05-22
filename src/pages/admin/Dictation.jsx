import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined, RightOutlined } from "@ant-design/icons";
import { getTestSetDictation } from "../../api/api";

const { Title, Text } = Typography;

function calcPercent(readyPartsCount, totalPartsCount) {
  const total = Number(totalPartsCount) || 0;
  const ready = Number(readyPartsCount) || 0;
  if (total <= 0) return 0;
  const raw = (ready / total) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function progressColor(percent) {
  if (percent < 20) return "#ff4d4f"; // đỏ
  if (percent < 100) return "#faad14"; // vàng
  return "#52c41a"; // xanh
}

function progressLabel(percent) {
  if (percent < 20) return { text: "Getting started", color: "red" };
  if (percent < 100) return { text: "In progress", color: "gold" };
  return { text: "Completed", color: "green" };
}

export default function Dictation() {
  const navigate = useNavigate();
  const [testSets, setTestSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getTestSetDictation();
      const data = Array.isArray(res?.data) ? res.data : [];
      setTestSets(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to load the test set list.");
      setTestSets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Dictation Management
            </Title>
            <Text type="secondary">Test sets</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Reload
          </Button>
        </div>

        {error ? <Alert type="error" showIcon message="Error" description={error} /> : null}

        {loading ? (
          <Row gutter={[16, 16]}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <Col key={idx} xs={24} sm={12} md={12} lg={8} xl={6}>
                <Card>
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Row gutter={[16, 16]}>
            {(testSets ?? []).map((item) => {
              const percent = calcPercent(item?.readyPartsCount, item?.totalPartsCount);
              const color = progressColor(percent);
              const status = progressLabel(percent);
              const ready = Number(item?.readyPartsCount) || 0;
              const total = Number(item?.totalPartsCount) || 0;
              const totalTests = Number(item?.totalTests) || 0;

              return (
                <Col key={item?.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <Card
                    hoverable
                    styles={{
                      body: {
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        minHeight: 230,
                        padding: 16,
                      },
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <Title level={4} style={{ margin: 0, lineHeight: 1.2 }} ellipsis={{ rows: 1 }}>
                          {item?.name || `Test set #${item?.id ?? "-"}`}
                        </Title>
                        <div style={{ marginTop: 6 }}>
                          <Tag color={status.color} style={{ marginInlineEnd: 0 }}>
                            {status.text}
                          </Tag>
                        </div>
                      </div>
                      <Text strong style={{ color, fontSize: 14 }}>
                        {percent}%
                      </Text>
                    </div>

                    <div>
                      <Progress
                        percent={percent}
                        showInfo={false}
                        strokeColor={color}
                        trailColor="#f5f5f5"
                        strokeLinecap="round"
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {ready} / {total} listening parts ready
                      </Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Text type="secondary">Number of tests</Text>
                      <Text strong>{totalTests} tests</Text>
                    </div>

                    <div style={{ marginTop: "auto" }}>
                      <Button
                        type="primary"
                        block
                        icon={<RightOutlined />}
                        onClick={() => {
                          navigate(`/admin/dictation/${item?.id}`, {
                            state: {
                              testSetId: item?.id,
                              testSetName: item?.name,
                              totalPartsCount: item?.totalPartsCount,
                              readyPartsCount: item?.readyPartsCount,
                              totalTests: item?.totalTests,
                            },
                          });
                        }}
                      >
                        View details
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Space>
    </div>
  );
}
