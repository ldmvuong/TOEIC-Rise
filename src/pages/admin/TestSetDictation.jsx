import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Space,
  Spin,
  Row,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleTwoTone,
  EditOutlined,
  EyeOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { getTestSetDictationDetail } from "../../api/api";

const { Title, Text } = Typography;

function normalizeReadyParts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "number") return x;
      if (typeof x === "string") {
        const num = parseInt((x.match(/\d+/) || [])[0], 10);
        return Number.isNaN(num) ? null : num;
      }
      if (x && typeof x === "object") {
        const maybe = x.partNumber ?? x.part ?? x.partNo ?? x.number;
        const num = parseInt(String(maybe ?? "").match(/\d+/)?.[0] ?? "", 10);
        return Number.isNaN(num) ? null : num;
      }
      return null;
    })
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4);
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function PartCard({ ready, partNo, onCreate, onView, onEdit }) {
  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 10,
        padding: 12,
        background: ready ? "rgba(82, 196, 26, 0.06)" : "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        minHeight: 56,
      }}
    >
      <Space size={8}>
        {ready ? (
          <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 18 }} />
        ) : (
          <PlusCircleOutlined style={{ fontSize: 18, color: "#8c8c8c" }} />
        )}
        <Text strong>{`Part ${partNo}`}</Text>
      </Space>

      {ready ? (
        <Space size={6}>
          <Tooltip title="View details">
            <Button size="small" icon={<EyeOutlined />} onClick={onView} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={onEdit} />
          </Tooltip>
        </Space>
      ) : (
        <Tooltip title="Create / export content for this part">
          <Button size="small" type="dashed" icon={<PlusCircleOutlined />} onClick={onCreate}>
            Export
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

export default function TestSetDictation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location?.state || {};
  const testSetName = state?.testSetName || `Test set #${id}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tests, setTests] = useState([]);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await getTestSetDictationDetail(id);
      const data = Array.isArray(res?.data) ? res.data : [];
      setTests(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to load test list.");
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location?.state?.refresh]);

  const summary = useMemo(() => {
    const totalTests = tests.length || 0;
    const totalParts = totalTests * 4;
    const readyParts = tests.reduce((acc, t) => acc + unique(normalizeReadyParts(t?.readyParts)).length, 0);

    return {
      totalTests,
      totalParts,
      readyParts,
    };
  }, [tests]);

  const handleCreatePart = (testId, partNo) => {
    navigate(`/admin/dictation/export?testId=${encodeURIComponent(testId)}&partId=${encodeURIComponent(partNo)}`, {
      state: {
        testSetName,
        testSetId: id,
        testId,
        partId: partNo,
      },
    });
  };

  const handleViewPart = (testId, partNo) => {
    message.info(`View details for Test ${testId} - Part ${partNo}`);
  };

  const handleEditPart = (testId, partNo) => {
    message.info(`Edit content for Test ${testId} - Part ${partNo}`);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Breadcrumb
          items={[
            { title: <Link to="/admin/dictation">Dictation</Link> },
            { title: testSetName },
          ]}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <Space align="center" size={10} wrap>
              <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
              <Title level={3} style={{ margin: 0 }} ellipsis={{ rows: 1 }}>
                {testSetName}
              </Title>
              <Tag color={summary.readyParts >= summary.totalParts && summary.totalParts > 0 ? "green" : "blue"}>
                {summary.readyParts}/{summary.totalParts} parts done
              </Tag>
              <Badge
                status={summary.readyParts >= summary.totalParts && summary.totalParts > 0 ? "success" : "processing"}
                text={`${summary.totalTests} tests`}
              />
            </Space>
          </div>

          <Button icon={<ReloadOutlined />} onClick={fetchDetail} loading={loading}>
            Reload
          </Button>
        </div>

        {error ? <Alert type="error" showIcon message="Error" description={error} /> : null}

        <Card>
          {loading ? (
            <div style={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Spin />
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {(tests ?? []).map((t) => {
                const readyParts = unique(normalizeReadyParts(t?.readyParts));
                const readyCount = readyParts.length;

                return (
                  <Col key={t?.id} xs={24} sm={12} lg={8} xl={6}>
                    <Card
                      hoverable
                      styles={{
                        body: {
                          padding: 16,
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          minHeight: 260,
                        },
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{ fontSize: 14 }} ellipsis={{ tooltip: t?.name }}>
                            {t?.name || `Test #${t?.id}`}
                          </Text>
                          <div style={{ marginTop: 6 }}>
                            <Tag color={readyCount === 4 ? "green" : readyCount > 0 ? "gold" : "default"}>
                              {readyCount}/4 parts ready
                            </Tag>
                          </div>
                        </div>
                      </div>

                      <Space direction="vertical" size={10}>
                        {[1, 2, 3, 4].map((partNo) => (
                          <PartCard
                            key={partNo}
                            partNo={partNo}
                            ready={readyParts.includes(partNo)}
                            onCreate={() => handleCreatePart(t?.id, partNo)}
                            onView={() => handleViewPart(t?.id, partNo)}
                            onEdit={() => handleEditPart(t?.id, partNo)}
                          />
                        ))}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      </Space>
    </div>
  );
}
