import { useState } from "react";
import { Modal, Button, Spin, Select, message as antdMessage } from "antd";
import { marked } from "marked";
import parse from "html-react-parser";
import api from "@/api/axios-customize";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const PART_OPTIONS = [
  { label: "Part 1", value: "PART_1" },
  { label: "Part 2", value: "PART_2" },
  { label: "Part 3", value: "PART_3" },
  { label: "Part 4", value: "PART_4" },
  { label: "Part 5", value: "PART_5" },
  { label: "Part 6", value: "PART_6" },
  { label: "Part 7", value: "PART_7" },
];

const SystemPromptExplanationTestModal = ({
  open,
  onClose,
  systemPromptContent,
}) => {
  const [selectedPart, setSelectedPart] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  const handleGenerate = async () => {
    if (!selectedPart) {
      antdMessage.warning("Please select a part number first.");
      return;
    }

    if (!systemPromptContent || systemPromptContent.trim().length < 20) {
      antdMessage.warning(
        "System prompt content is invalid. Please ensure it is at least 20 characters."
      );
      return;
    }

    const backendUrl =
      api?.defaults?.baseURL ||
      import.meta.env.VITE_BACKEND_URL ||
      window.location.origin;
    const token = localStorage.getItem("access_token");

    const formData = new FormData();
    formData.append("partName", selectedPart);
    // If backend DTO is later extended to accept systemPromptContent, this is ready:
    formData.append("systemPromptContent", systemPromptContent);

    setGeneratedText("");
    setGenerating(true);

    try {
      const response = await fetch(
        `${backendUrl}/staff/chatbot/testing-system-prompt-explanation-generation`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "text/event-stream, application/json",
          },
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Không nhận được phản hồi từ AI.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processBuffer = () => {
        const findBoundary = () => {
          const doubleNewLine = buffer.indexOf("\n\n");
          const doubleCarriage = buffer.indexOf("\r\n\r\n");
          if (doubleNewLine === -1 && doubleCarriage === -1) return null;
          if (doubleNewLine === -1)
            return { index: doubleCarriage, length: 4 };
          if (doubleCarriage === -1) return { index: doubleNewLine, length: 2 };
          return doubleNewLine < doubleCarriage
            ? { index: doubleNewLine, length: 2 }
            : { index: doubleCarriage, length: 4 };
        };

        let boundary;
        // eslint-disable-next-line no-cond-assign
        while ((boundary = findBoundary()) !== null) {
          const rawEvent = buffer.slice(0, boundary.index).trim();
          buffer = buffer.slice(boundary.index + boundary.length);

          if (!rawEvent.startsWith("data:")) continue;
          const payloadStr = rawEvent.replace(/^data:\s*/, "");
          if (!payloadStr || payloadStr === "[DONE]") continue;

          try {
            const payload = JSON.parse(payloadStr);
            if (payload.content) {
              setGeneratedText((prev) => prev + payload.content);
            }
          } catch (err) {
            console.error("Không parse được dữ liệu AI:", err);
          }
        }
      };

      while (true) {
        let readResult;
        try {
          readResult = await reader.read();
        } catch (readError) {
          console.warn("Stream closed unexpectedly:", readError);
          break;
        }
        const { value, done } = readResult;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }

      buffer += decoder.decode();
      processBuffer();
    } catch (error) {
      console.error(error);
      antdMessage.error(
        error.message ||
          "Không thể gọi AI để test explanation generation system prompt."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedPart(null);
    setGenerating(false);
    setGeneratedText("");
    onClose?.();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      centered
      closable
      title="Test Explanation Generation System Prompt"
      bodyStyle={{ padding: 0 }}
    >
      <div className="flex flex-col h-[70vh]">
        <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Explanation Generator Tester
            </div>
            <div className="text-xs text-gray-500">
              Select a part and generate a sample explanation using this system
              prompt.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Part</span>
            <Select
              value={selectedPart}
              onChange={setSelectedPart}
              placeholder="Chọn Part"
              options={PART_OPTIONS}
              style={{ width: 140 }}
              size="small"
            />
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-6"
          style={{ maxHeight: "calc(70vh - 160px)" }}
        >
          {generatedText ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 prose prose-sm max-w-none">
              {parse(
                marked.parse(generatedText, {
                  breaks: true,
                })
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm">
                Chọn Part và nhấn &quot;Generate explanation&quot; để test
                system prompt.
              </p>
              <p className="text-xs mt-1">
                Hệ thống sẽ tạo một lời giải thích mẫu dựa trên system prompt và
                Part đã chọn.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <Button onClick={handleClose} disabled={generating}>
            Close
          </Button>
          <Button
            type="primary"
            onClick={handleGenerate}
            loading={generating}
          >
            Generate explanation
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SystemPromptExplanationTestModal;

