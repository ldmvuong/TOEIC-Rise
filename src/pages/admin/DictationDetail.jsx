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
import {
  ArrowLeftOutlined,
  CloseOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import parse from "html-react-parser";
import { getDictationDetail, updateDictationTranscript } from "../../api/api";

const { Title, Text } = Typography;

function isPartId(value, allowed) {
  const n = Number(value);
  return Number.isFinite(n) && allowed.includes(n);
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

export default function DictationDetail() {
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
  const [editingMap, setEditingMap] = useState({});
  const [savingMap, setSavingMap] = useState({});

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
    next.forEach((row) => {
      const opts = Array.isArray(row.options) ? [...row.options] : [];
      while (opts.length < optionCount) opts.push("");
      row.options = opts.slice(0, optionCount);
    });
    setEditing(next);
  };

  const setItemEditing = (key, value) => {
    setEditingMap((prev) => ({ ...prev, [key]: !!value }));
  };

  const fetchDetail = async () => {
    if (!testId || !partId) {
      setError("Missing query params: testId / partId");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setProgress(10);

    let alive = true;
    const timer = window.setInterval(() => {
      setProgress((p) => {
        if (!alive) return p;
        if (p >= 92) return p;
        return Math.min(92, p + 6);
      });
    }, 350);

    try {
      const res = await getDictationDetail(testId, partId);
      const data = Array.isArray(res?.data) ? res.data : [];
      setItems(data);
      hydrateEditing(data);
      setEditingMap({});
      setSavingMap({});
      setProgress(100);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to load dictation detail.");
      setItems([]);
      setEditing([]);
      setEditingMap({});
      setSavingMap({});
      setProgress(0);
    } finally {
      alive = false;
      window.clearInterval(timer);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
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

  const handleSaveOne = async (reviewKey, idx) => {
    const row = editing[idx] || {};
    const item = items[idx] || {};
    const idValue = item?.id ?? row?.id;
    if (!idValue) {
      message.error("Missing dictation transcript id.");
      return;
    }

    setSavingMap((prev) => ({ ...prev, [reviewKey]: true }));
    try {
      const payload = {
        id: Number(idValue),
        questionText: canShowQuestionText ? safeText(row.questionText) : "",
        options: canShowOptions ? (Array.isArray(row.options) ? row.options.map((x) => safeText(x)) : []) : [],
        passageText: canShowPassageText ? safeText(row.passageText) : "",
      };

      if (canShowOptions) {
        const opts = Array.isArray(payload.options) ? [...payload.options] : [];
        while (opts.length < optionCount) opts.push("");
        payload.options = opts.slice(0, optionCount);
      }

      await updateDictationTranscript(payload);
      message.success("Updated.");
      setItemEditing(reviewKey, false);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "Update failed.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [reviewKey]: false }));
    }
  };

  const headerTitle = useMemo(() => {
    const testLabel = testId ? `Test #${testId}` : "Test";
    const partLabel = partNo ? `Part ${partNo}` : "Part";
    return `${testLabel} • ${partLabel}`;
  }, [partNo, testId]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Breadcrumb
          items={[
            { title: <Link to="/admin/dictation">Dictation</Link> },
            state?.testSetName ? { title: state.testSetName } : null,
            { title: headerTitle },
          ].filter(Boolean)}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <Space align="center" size={10} wrap>
              <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Dictation detail
                </Title>
                <Text type="secondary">
                  {headerTitle}
                </Text>
              </div>
            </Space>
          </div>

          {/* Actions intentionally hidden for now.
              Admin will edit per-questionGroup via upcoming APIs. */}
        </div>

        {error ? <Alert type="error" showIcon message="Error" description={error} /> : null}

        {loading ? (
          <Card>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Space>
                  <Spin />
                  <Text strong>Loading…</Text>
                </Space>
                <Text type="secondary">Fetching dictation detail</Text>
              </div>
              <Progress percent={progress} status="active" strokeLinecap="round" />
              <Skeleton active paragraph={{ rows: 5 }} />
            </Space>
          </Card>
        ) : !items.length ? (
          <Card>
            <Empty description="No items" />
          </Card>
        ) : (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            {items.map((q, idx) => {
              const editRow = editing[idx] || {};
              const reviewKey = q?.id ?? q?.questionGroupId ?? idx;
              const isEditing = !!editingMap?.[reviewKey];
              const isSaving = !!savingMap?.[reviewKey];

              return (
                <Card key={reviewKey} styles={{ body: { padding: 16, position: "relative" } }}>
                  <div style={{ position: "absolute", top: 10, right: 12, zIndex: 1 }}>
                    <Space size={4}>
                      {!isEditing ? (
                        <Tooltip title="Edit">
                          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setItemEditing(reviewKey, true)} />
                        </Tooltip>
                      ) : (
                        <>
                          <Tooltip title="Save">
                            <Button
                              type="text"
                              size="small"
                              icon={<SaveOutlined />}
                              loading={isSaving}
                              onClick={() => handleSaveOne(reviewKey, idx)}
                            />
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <Button
                              type="text"
                              size="small"
                              icon={<CloseOutlined />}
                              disabled={isSaving}
                              onClick={() => {
                                // revert this row to API data
                                const item = items[idx] || {};
                                setEditing((prev) => {
                                  const next = [...prev];
                                  const opts = Array.isArray(item?.options) ? item.options.map((x) => safeText(x)) : [];
                                  while (opts.length < optionCount) opts.push("");
                                  next[idx] = {
                                    ...next[idx],
                                    id: item?.id,
                                    questionGroupId: item?.questionGroupId,
                                    questionText: safeText(item?.questionText),
                                    passageText: safeText(item?.passageText),
                                    options: opts.slice(0, optionCount),
                                  };
                                  return next;
                                });
                                setItemEditing(reviewKey, false);
                              }}
                            />
                          </Tooltip>
                        </>
                      )}
                    </Space>
                  </div>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card size="small" title="Transcript" styles={{ body: { background: "#fafafa" } }}>
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
                                readOnly={!isEditing}
                                disabled={isSaving}
                                style={
                                  !isEditing
                                    ? {
                                        background: "#fff",
                                        color: "rgba(0, 0, 0, 0.88)",
                                        cursor: "default",
                                      }
                                    : undefined
                                }
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
                                    readOnly={!isEditing}
                                    disabled={isSaving}
                                    style={
                                      !isEditing
                                        ? {
                                            background: "#fff",
                                            color: "rgba(0, 0, 0, 0.88)",
                                            cursor: "default",
                                          }
                                        : undefined
                                    }
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
                                readOnly={!isEditing}
                                disabled={isSaving}
                                style={
                                  !isEditing
                                    ? {
                                        background: "#fff",
                                        color: "rgba(0, 0, 0, 0.88)",
                                        cursor: "default",
                                      }
                                    : undefined
                                }
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
