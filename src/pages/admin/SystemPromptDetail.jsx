import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSystemPromptDetail } from "@/api/api";
import { Spin, Tag, Alert, Button, Descriptions } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

const typeToEnumMap = {
  chatbot: "CHATBOT",
  "q-and-a": "Q_AND_A",
  explanation: "EXPLANATION_GENERATION",
};

const typeToLabelMap = {
  chatbot: "Chatbot",
  "q-and-a": "Q & A",
  explanation: "Explanation Generation",
};

const SystemPromptDetailPage = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(null);

  const featureTypeEnum = useMemo(() => {
    if (!type) return null;
    return typeToEnumMap[type] || null;
  }, [type]);

  const typeLabel = useMemo(() => {
    if (!type) return "";
    return typeToLabelMap[type] || type;
  }, [type]);

  useEffect(() => {
    if (!id) return;

    if (!featureTypeEnum) {
      setError("Invalid request, Invalid feature type");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getSystemPromptDetail(featureTypeEnum, id);
        if (!isMounted) return;
        setPrompt(res?.data ?? null);
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || "System Prompt not found");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [id, featureTypeEnum]);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          Back
        </Button>
        <Alert
          type="error"
          message={error || "System Prompt not found"}
          showIcon
        />
      </div>
    );
  }

  const { content, version, isActive, createdAt, updatedAt } = prompt;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          shape="circle"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {typeLabel} System Prompt
          </h1>
          <div className="text-gray-500 text-sm mt-1">
            ID: {prompt.id} • Version: {version}
          </div>
        </div>
        <div className="ml-auto">
          <Tag color={isActive ? "green" : "red"}>
            {isActive ? "Active" : "Inactive"}
          </Tag>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Metadata</h2>
        </div>
        <div className="p-6">
          <Descriptions column={1} size="middle" bordered>
            <Descriptions.Item label="ID">{prompt.id}</Descriptions.Item>
            <Descriptions.Item label="Feature Type">
              {featureTypeEnum}
            </Descriptions.Item>
            <Descriptions.Item label="Version">{version}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={isActive ? "green" : "red"}>
                {isActive ? "Active" : "Inactive"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {formatDateTime(createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {formatDateTime(updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Content</h2>
        </div>
        <div className="p-6">
          <pre className="whitespace-pre-wrap break-words text-gray-800 text-sm bg-gray-50 rounded-lg p-4 border border-gray-200">
            {content || "-"}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SystemPromptDetailPage;

