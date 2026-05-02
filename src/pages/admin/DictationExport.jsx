import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Skeleton,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, CheckOutlined, ReloadOutlined, CheckCircleTwoTone } from "@ant-design/icons";
import parse from "html-react-parser";
import { generateDictationPreview, importDictation } from "../../api/api";

const { Title, Text } = Typography;

function isPartId(value, allowed) {
  const n = Number(value);
  return Number.isFinite(n) && allowed.includes(n);
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

export default function DictationExport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const testId = params.get("testId");
  const partId = params.get("partId");
  const state = location?.state || {};

  const partNo = useMemo(() => {
    const n = Number(partId);
    return Number.isFinite(n) ? n : null;
  }, [partId]);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState([]);
  const [importing, setImporting] = useState(false);
  const [reviewedMap, setReviewedMap] = useState({});

  const canShowQuestionText = isPartId(partId, [2]);
  const canShowOptions = isPartId(partId, [1, 2]);
  const canShowPassageText = isPartId(partId, [3, 4]);
  const optionCount = useMemo(() => (Number(partId) === 2 ? 3 : 4), [partId]);

  const hydrateEditing = (data) => {
    const next = (data ?? []).map((q) => ({
      id: q?.id,
      questionGroupId: q?.questionGroupId,
      questionText: safeText(q?.questionText),
      passageText: safeText(q?.passageText),
      options: Array.isArray(q?.options) ? q.options.map((x) => safeText(x)) : [],
    }));
    // normalize option length based on part
    next.forEach((row) => {
      const opts = Array.isArray(row.options) ? [...row.options] : [];
      while (opts.length < optionCount) opts.push("");
      row.options = opts.slice(0, optionCount);
    });
    setEditing(next);
  };

  const toggleReviewed = (key) => {
    setReviewedMap((prev) => ({ ...prev, [key]: !prev?.[key] }));
  };

  const runPreview = async () => {
    if (!testId || !partId) {
      setError("Missing query params: testId / partId");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setProgress(5);

    // Fake progress animation while waiting for long-running API
    let alive = true;
    const timer = window.setInterval(() => {
      setProgress((p) => {
        if (!alive) return p;
        if (p >= 92) return p;
        const step = p < 40 ? 7 : p < 70 ? 4 : 2;
        return Math.min(92, p + step);
      });
    }, 650);

    try {
      const res = await generateDictationPreview(testId, partId);
      const data = Array.isArray(res?.data) ? res.data : [];
      setItems(data);
      hydrateEditing(data);
      setReviewedMap({});
      setProgress(100);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to generate preview.");
      setItems([]);
      setEditing([]);
      setReviewedMap({});
      setProgress(0);
    } finally {
      alive = false;
      window.clearInterval(timer);
      setLoading(false);
    }
  };

  useEffect(() => {
    runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, partId]);

  const handleChange = (index, patch) => {
    setEditing((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleChangeOption = (index, optIndex, value) => {
    setEditing((prev) => {
      const next = [...prev];
      const row = next[index] || {};
      const opts = Array.isArray(row.options) ? [...row.options] : [];
      while (opts.length < optionCount) opts.push("");
      opts[optIndex] = value;
      next[index] = { ...row, options: opts.slice(0, optionCount) };
      return next;
    });
  };

  const handleAcceptExport = async () => {
    if (!testId || !partId) return;
    if (!items.length) return;

    const total = items.length;
    const reviewedCount = items.reduce((acc, q, idx) => {
      const key = q?.id ?? q?.questionGroupId ?? idx;
      return acc + (reviewedMap?.[key] ? 1 : 0);
    }, 0);
    const unreviewed = total - reviewedCount;

    if (unreviewed > 0) {
      const ok = await new Promise((resolve) => {
        Modal.confirm({
          title: "Some items are not reviewed",
          content: `You have reviewed ${reviewedCount}/${total} items. Proceed with import anyway?`,
          okText: "Proceed",
          cancelText: "Cancel",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!ok) return;
    }

    setImporting(true);
    try {
      const transcripts = (items ?? []).map((q, idx) => {
        const row = editing[idx] || {};

        const out = {
          questionGroupId: q?.questionGroupId ?? row?.questionGroupId,
          questionText: canShowQuestionText ? safeText(row.questionText) : "",
          options: canShowOptions ? (Array.isArray(row.options) ? row.options.map((x) => safeText(x)) : []) : [],
          passageText: canShowPassageText ? safeText(row.passageText) : "",
        };

        // normalize options length
        if (canShowOptions) {
          const opts = Array.isArray(out.options) ? [...out.options] : [];
          while (opts.length < optionCount) opts.push("");
          out.options = opts.slice(0, optionCount);
        }

        return out;
      });

      const missingQg = transcripts.find((t) => !t?.questionGroupId);
      if (missingQg) {
        throw new Error("Missing questionGroupId in transcripts payload.");
      }

      await importDictation({
        testId: Number(testId),
        partId: Number(partId),
        transcripts,
      });

      message.success("Import successful.");
      const testSetId = state?.testSetId;
      if (testSetId) {
        navigate(`/admin/dictation/${testSetId}`, {
          replace: true,
          state: {
            testSetId,
            testSetName: state?.testSetName,
            refresh: Date.now(),
          },
        });
      } else {
        navigate(-1);
      }
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Breadcrumb
          items={[
            { title: <Link to="/admin/dictation">Dictation</Link> },
            state?.testSetName ? { title: state.testSetName } : null,
            { title: "Export preview" },
          ].filter(Boolean)}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <Space align="center" size={10} wrap>
              <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Export preview
                </Title>
                <Text type="secondary">
                  Test #{testId} • Part {partNo ?? "-"}
                </Text>
              </div>
            </Space>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={runPreview} loading={loading}>
              Regenerate
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleAcceptExport}
              disabled={loading || importing || !items.length}
              loading={importing}
            >
              Accept export
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message="Error" description={error} /> : null}

        {loading ? (
          <Card>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Space>
                  <Spin />
                  <Text strong>Generating preview…</Text>
                </Space>
                <Text type="secondary">This can take a while</Text>
              </div>
              <Progress percent={progress} status="active" strokeLinecap="round" />
              <Skeleton active paragraph={{ rows: 5 }} />
            </Space>
          </Card>
        ) : !items.length ? (
          <Card>
            <Empty description="No preview items" />
          </Card>
        ) : (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            {items.map((q, idx) => {
              const editRow = editing[idx] || {};
              const reviewKey = q?.id ?? q?.questionGroupId ?? idx;
              const isReviewed = !!reviewedMap?.[reviewKey];
              return (
                <Card
                  key={reviewKey}
                  styles={{ body: { padding: 16, position: "relative" } }}
                >
                  <div style={{ position: "absolute", top: 10, right: 12, zIndex: 1 }}>
                    <Tooltip title={isReviewed ? "Reviewed" : "Mark as reviewed"}>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => toggleReviewed(reviewKey)}
                        icon={
                          <CheckCircleTwoTone
                            twoToneColor={isReviewed ? "#52c41a" : "#d9d9d9"}
                            style={{ fontSize: 18 }}
                          />
                        }
                      />
                    </Tooltip>
                  </div>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card
                        size="small"
                        title="Transcript"
                        styles={{ body: { background: "#fafafa" } }}
                      >
                        <div style={{ lineHeight: 1.6 }}>
                          {q?.transcript ? parse(String(q.transcript)) : <Text type="secondary">No transcript</Text>}
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                      <Card size="small" title="Review & edit">
                        <Form layout="vertical">
                          {canShowQuestionText ? (
                            <Form.Item label="Question text">
                              <Input
                                value={editRow.questionText ?? ""}
                                onChange={(e) => handleChange(idx, { questionText: e.target.value })}
                                placeholder="Question text"
                              />
                            </Form.Item>
                          ) : null}

                          {canShowOptions ? (
                            <Form.Item label="Options">
                              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                {Array.from({ length: optionCount }).map((_, optIdx) => (
                                  <Input
                                    key={optIdx}
                                    value={(editRow.options || [])[optIdx] ?? ""}
                                    onChange={(e) => handleChangeOption(idx, optIdx, e.target.value)}
                                    addonBefore={String.fromCharCode(65 + optIdx)}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                  />
                                ))}
                              </Space>
                            </Form.Item>
                          ) : null}

                          {canShowPassageText ? (
                            <Form.Item label="Passage text">
                              <Input.TextArea
                                autoSize={{ minRows: 10, maxRows: 22 }}
                                value={editRow.passageText ?? ""}
                                onChange={(e) => handleChange(idx, { passageText: e.target.value })}
                                placeholder="Passage text"
                              />
                            </Form.Item>
                          ) : null}

                          {!canShowQuestionText && !canShowOptions && !canShowPassageText ? (
                            <Alert
                              type="info"
                              showIcon
                              message="Nothing to edit for this part"
                              description="This part does not require manual review fields."
                            />
                          ) : null}
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </Space>
        )}
      </Space>
    </div>
  );
}
