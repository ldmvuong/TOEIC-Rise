import { useState, useEffect, useRef } from "react";
import { Modal, Input, Button, Spin, Select, message as antdMessage } from "antd";
import { marked } from "marked";
import parse from "html-react-parser";
import api from "@/api/axios-customize";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const { TextArea } = Input;

const PART_OPTIONS = [
  { label: "Part 1", value: "PART_1" },
  { label: "Part 2", value: "PART_2" },
  { label: "Part 3", value: "PART_3" },
  { label: "Part 4", value: "PART_4" },
  { label: "Part 5", value: "PART_5" },
  { label: "Part 6", value: "PART_6" },
  { label: "Part 7", value: "PART_7" },
];

const renderPlainText = (text = "") => {
  if (!text) return null;
  const segments = text.split("\n");
  return segments.map((segment, index) => (
    <span key={`segment-${index}`}>
      {segment}
      {index < segments.length - 1 && <br />}
    </span>
  ));
};

const SystemPromptQAndATestModal = ({
  open,
  onClose,
  systemPromptContent,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [selectedPart, setSelectedPart] = useState(null);
  const messagesEndRef = useRef(null);
  const conversationIdRef = useRef("");

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInputMessage("");
      setConversationId("");
      setSelectedPart(null);
      conversationIdRef.current = "";
    }
  }, [open]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    if (!selectedPart) {
      antdMessage.warning("Please select a part number before chatting.");
      return;
    }

    if (!systemPromptContent || systemPromptContent.trim().length < 20) {
      antdMessage.warning(
        "System prompt content is invalid. Please ensure it is at least 20 characters."
      );
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setSending(true);

    const assistantMessageId = `assistant-${Date.now()}`;
    const backendUrl =
      api?.defaults?.baseURL ||
      import.meta.env.VITE_BACKEND_URL ||
      window.location.origin;
    const token = localStorage.getItem("access_token");

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    const formData = new FormData();
    formData.append("message", userMessage.content);
    formData.append("systemPromptContent", systemPromptContent);
    formData.append("partName", selectedPart);
    if (conversationIdRef.current) {
      formData.append("conversationId", conversationIdRef.current);
    }

    let aggregatedContent = "";

    try {
      const response = await fetch(
        `${backendUrl}/staff/chatbot/testing-q-and-a-system-prompt`,
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
            if (payload.conversationId && !conversationIdRef.current) {
              conversationIdRef.current = payload.conversationId;
              setConversationId(payload.conversationId);
            }

            if (payload.content) {
              aggregatedContent += payload.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: aggregatedContent,
                        messageType: payload.messageType,
                        timestamp: new Date(),
                      }
                    : msg
                )
              );
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
      if (!aggregatedContent) {
        antdMessage.error(
          error.message ||
            "Không thể gửi tin nhắn tới AI để test system prompt Q&A."
        );
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        );
      } else {
        console.warn(
          "AI stream ended with warning after delivering content (testing Q&A system prompt)."
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!open) return null;

  const selectedPartLabel =
    PART_OPTIONS.find((p) => p.value === selectedPart)?.label || "Chọn Part";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      closable
      title="Test Q&A System Prompt"
      bodyStyle={{ padding: 0 }}
    >
      <div className="flex flex-col h-[70vh]">
        <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-sky-50 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Q&A Chatbot Tester
            </div>
            <div className="text-xs text-gray-500">
              This chat uses the selected system prompt content and part number.
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
          className="flex-1 overflow-y-auto p-6 space-y-4"
          style={{ maxHeight: "calc(70vh - 160px)" }}
        >
          {messages.length === 0 ? (
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
                Chọn Part và bắt đầu cuộc trò chuyện để test system prompt Q&A.
              </p>
              <p className="text-xs mt-1">
                Bạn có thể hỏi về câu hỏi, nội dung hoặc hành vi của Chatbot
                theo Part đã chọn.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div
                    className={
                      msg.role === "assistant"
                        ? "text-sm leading-relaxed [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mt-1 [&_strong]:font-semibold [&_em]:italic"
                        : "text-sm leading-relaxed whitespace-pre-wrap"
                    }
                  >
                    {msg.role === "assistant"
                      ? parse(
                          marked.parse(msg.content || "", {
                            breaks: true,
                          })
                        )
                      : renderPlainText(msg.content || "")}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      msg.role === "user" ? "text-emerald-100" : "text-gray-500"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <TextArea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedPart
                  ? `Nhập câu hỏi để test system prompt cho ${selectedPartLabel}...`
                  : "Chọn Part trước khi chat..."
              }
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={sending}
              className="flex-1"
            />
            <Button
              type="primary"
              onClick={handleSendMessage}
              loading={sending}
              disabled={!inputMessage.trim() || sending}
              className="px-6"
              icon={
                sending ? (
                  <Spin size="small" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )
              }
            >
              Gửi
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SystemPromptQAndATestModal;

