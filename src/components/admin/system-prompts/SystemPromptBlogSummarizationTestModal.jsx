import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Input, message as antdMessage } from "antd";
import { marked } from "marked";
import parse from "html-react-parser";
import api from "@/api/axios-customize";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const { TextArea } = Input;

const stripHtml = (html = "") => String(html).replace(/<[^>]*>/g, "").trim();

const SystemPromptBlogSummarizationTestModal = ({
  open,
  onClose,
  systemPromptContent,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setContent("");
    setGenerating(false);
    setGeneratedText("");
  }, [open]);

  const isPromptValid = useMemo(() => {
    const trimmed = (systemPromptContent || "").trim();
    return trimmed.length >= 20;
  }, [systemPromptContent]);

  const handleGenerate = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      antdMessage.warning("Please enter a blog post title.");
      return;
    }

    if (stripHtml(trimmedContent).length < 50) {
      antdMessage.warning("Please enter at least 50 characters of content.");
      return;
    }

    if (!isPromptValid) {
      antdMessage.warning(
        "System prompt content is invalid. Please ensure it is at least 20 characters.",
      );
      return;
    }

    const backendUrl =
      api?.defaults?.baseURL ||
      import.meta.env.VITE_BACKEND_URL ||
      window.location.origin;
    const token = localStorage.getItem("access_token");

    const formData = new FormData();
    formData.append("title", trimmedTitle);
    formData.append("content", trimmedContent);
    // Allow backend to ignore if not part of DTO; keeps tester consistent with other modals.
    formData.append("systemPromptContent", systemPromptContent || "");

    setGeneratedText("");
    setGenerating(true);

    try {
      const response = await fetch(
        `${backendUrl}/staff/chatbot/testing-system-prompt-blog-summary`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "text/event-stream, application/json",
          },
        },
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
          if (doubleNewLine === -1) return { index: doubleCarriage, length: 4 };
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
        error.message || "Không thể gọi AI để test blog summarization system prompt.",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      centered
      closable
      title="Test Blog Summarization System Prompt"
      bodyStyle={{ padding: 0 }}
    >
      <div className="flex flex-col h-[72vh]">
        <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-sky-50 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Blog Summary Tester
            </div>
            <div className="text-xs text-gray-500">
              Provide a title + content and generate a summary using this system prompt.
            </div>
          </div>
          {!isPromptValid ? (
            <span className="text-xs text-red-500">
              System prompt content is empty or invalid.
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 min-h-0">
          <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Blog post title <span className="text-red-500">*</span>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a blog post title"
                  maxLength={150}
                  showCount
                  disabled={generating}
                />
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Blog post content <span className="text-red-500">*</span>
                </div>
                <TextArea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste blog content (plain text or HTML)"
                  autoSize={{ minRows: 10, maxRows: 18 }}
                  disabled={generating}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Tip: content must be at least 50 characters.
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto min-h-0">
            {generatedText ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 prose prose-sm max-w-none">
                {parse(marked.parse(generatedText, { breaks: true }) ?? "")}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <p className="text-sm">
                  Fill in title + content, then click &quot;Generate summary&quot;.
                </p>
                <p className="text-xs mt-1">
                  The result will stream in here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <Button onClick={onClose} disabled={generating}>
            Close
          </Button>
          <Button type="primary" onClick={handleGenerate} loading={generating}>
            Generate summary
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SystemPromptBlogSummarizationTestModal;

