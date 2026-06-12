import { useState, useEffect } from "react";
import { Modal, Button, Spin, Select, message as antdMessage } from "antd";
import { marked } from "marked";
import parse from "html-react-parser";
import api from "@/api/axios-customize";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const formatPartLabel = (partName = "") => {
  const raw = String(partName || "").trim();
  if (!raw) return "";

  const numericMatch = raw.match(/\d+/);
  if (/^part[\s_-]*\d+$/i.test(raw) || /^PART_\d+$/i.test(raw)) {
    return `Part ${numericMatch?.[0] || raw}`;
  }

  return raw;
};

const normalizePartOption = (item) => {
  if (typeof item === "string") {
    return { label: formatPartLabel(item), value: item };
  }

  if (!item || typeof item !== "object") return null;

  const value = item.partName ?? item.name ?? item.value ?? item.id;
  if (value == null || value === "") return null;

  return {
    label: item.label ?? formatPartLabel(value),
    value: String(value),
  };
};

const normalizeQuestionOptions = (options) => {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      if (option == null) return null;

      if (typeof option === "string") {
        return {
          label: String.fromCharCode(65 + index),
          text: option,
        };
      }

      if (typeof option !== "object") {
        return {
          label: String.fromCharCode(65 + index),
          text: String(option),
        };
      }

      const label =
        option.label ??
        option.optionLabel ??
        option.key ??
        String.fromCharCode(65 + index);
      const text =
        option.text ?? option.content ?? option.value ?? option.option ?? "";

      if (!String(text).trim()) return null;

      return {
        label: String(label),
        text: String(text),
      };
    })
    .filter(Boolean);
};

const renderRichContent = (text = "") => {
  const value = String(text || "").trim();
  if (!value) return null;

  return parse(
    marked.parse(value, {
      breaks: true,
    }),
  );
};

const SystemPromptExplanationTestModal = ({
  open,
  onClose,
  systemPromptContent,
}) => {
  const [selectedPart, setSelectedPart] = useState(null);
  const [partOptions, setPartOptions] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedPart(null);
      setSelectedQuestion(null);
      setPartOptions([]);
      setGeneratedText("");
      setGenerating(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    const loadPartNames = async () => {
      setPartsLoading(true);

      try {
        const response = await api.get("/staff/parts/part-names");
        const payload = response?.data;
        const rawPartNames = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        if (ignore) return;

        const nextOptions = rawPartNames
          .map(normalizePartOption)
          .filter(Boolean)
          .filter((opt) => {
            const val = String(opt.value).toLowerCase();
            return !val.includes("speaking") && !val.includes("writing");
          });

        setPartOptions(nextOptions);
      } catch (error) {
        if (ignore) return;
        console.error(error);
        setPartOptions([]);
        antdMessage.error(
          error?.message || "Cannot load part list to test explanation.",
        );
      } finally {
        if (!ignore) setPartsLoading(false);
      }
    };

    loadPartNames();

    return () => {
      ignore = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!selectedPart) {
      setSelectedQuestion(null);
      return;
    }

    let ignore = false;

    const loadRandomQuestion = async () => {
      setQuestionLoading(true);
      setSelectedQuestion(null);

      try {
        const response = await api.get("/staff/questions/random", {
          params: { partName: selectedPart },
        });
        const payload = response?.data;
        const questionData = payload?.data ?? payload;

        if (ignore) return;
        setSelectedQuestion(questionData || null);
      } catch (error) {
        if (ignore) return;
        console.error(error);
        setSelectedQuestion(null);
        antdMessage.error(
          error?.message || "Cannot load random question for selected Part.",
        );
      } finally {
        if (!ignore) setQuestionLoading(false);
      }
    };

    loadRandomQuestion();

    return () => {
      ignore = true;
    };
  }, [open, selectedPart]);

  const handleGenerate = async () => {
    if (!selectedQuestion?.id) {
      antdMessage.warning(
        "Please select a part and wait for a question to load before generating.",
      );
      return;
    }

    if (!systemPromptContent || systemPromptContent.trim().length < 20) {
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
    formData.append("questionId", String(selectedQuestion.id));
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
        },
      );

      if (!response.ok || !response.body) {
        throw new Error("No response was received from AI.");
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
            console.error("Unable to parse AI data:", err);
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
          "Unable to call AI to test the explanation generation system prompt.",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  const selectedPartLabel =
    partOptions.find((p) => p.value === selectedPart)?.label ||
    formatPartLabel(selectedPart) ||
    "Select Part";

  const questionOptions = normalizeQuestionOptions(selectedQuestion?.options);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      centered
      closable
      title="Test Explanation Generation System Prompt"
      bodyStyle={{ padding: 0 }}
    >
      <div className="flex flex-col h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between shrink-0">
          <div className="pr-4">
            <div className="text-base font-semibold text-gray-900">
              Explanation Generator Tester
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Select a part to load a random question, then generate an
              explanation to test the prompt.
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 min-w-[220px]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Part:</span>
              <Select
                value={selectedPart}
                onChange={setSelectedPart}
                placeholder={partsLoading ? "Loading..." : "Select Part"}
                options={partOptions}
                style={{ width: 160 }}
                loading={partsLoading}
                disabled={partsLoading || partOptions.length === 0}
                showSearch
                optionFilterProp="label"
              />
            </div>
          </div>
        </div>

        {/* Split Content */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Left Pane - Context */}
          <div className="flex flex-col min-h-0 bg-slate-50/50">
            <div className="px-6 py-3 border-b border-gray-200 bg-slate-100/50 shrink-0 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Question Context
              </h3>
              {selectedQuestion && (
                <span className="text-[11px] font-medium bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full shadow-sm">
                  {selectedPartLabel}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {questionLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3 text-gray-500">
                  <Spin size="large" />
                  <span className="text-sm">Loading random question...</span>
                </div>
              ) : selectedQuestion ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
                  <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-800">
                      Question #
                      {selectedQuestion.position || selectedQuestion.id}
                    </span>
                    {selectedQuestion.partName && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedQuestion.partName}
                      </span>
                    )}
                    {selectedQuestion.correctOption && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded ml-auto">
                        Correct: {selectedQuestion.correctOption}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 text-sm text-gray-800">
                    {selectedQuestion.content && (
                      <div>
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Content
                        </div>
                        <div className="leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                          {renderRichContent(selectedQuestion.content)}
                        </div>
                      </div>
                    )}

                    {selectedQuestion.passage && (
                      <div>
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Passage
                        </div>
                        <div className="leading-relaxed bg-amber-50/30 p-3 rounded-lg border border-amber-100/50">
                          {renderRichContent(selectedQuestion.passage)}
                        </div>
                      </div>
                    )}

                    {selectedQuestion.transcript && (
                      <div>
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Transcript
                        </div>
                        <div className="leading-relaxed bg-blue-50/30 p-3 rounded-lg border border-blue-100/50 whitespace-pre-wrap">
                          {renderRichContent(selectedQuestion.transcript)}
                        </div>
                      </div>
                    )}

                    {selectedQuestion.imageUrl && (
                      <div>
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Image
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-center">
                          <img
                            src={selectedQuestion.imageUrl}
                            alt={`Question ${selectedQuestion.id}`}
                            className="max-h-60 w-auto rounded object-contain shadow-sm"
                          />
                        </div>
                      </div>
                    )}

                    {questionOptions.length > 0 && (
                      <div>
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Options
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {questionOptions.map((option) => {
                            const isCorrect =
                              selectedQuestion.correctOption === option.label;
                            return (
                              <div
                                key={`${option.label}-${option.text}`}
                                className={`rounded-lg border p-3 flex gap-3 ${
                                  isCorrect
                                    ? "border-emerald-200 bg-emerald-50/50"
                                    : "border-slate-200 bg-white shadow-sm"
                                }`}
                              >
                                <span
                                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                                    isCorrect
                                      ? "bg-emerald-500 text-white"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {option.label}
                                </span>
                                <div className="text-sm text-slate-700 pt-0.5 whitespace-pre-wrap">
                                  {option.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      No question selected
                    </p>
                    <p className="text-xs mt-1">
                      Please select a Part from the header to load a random
                      question.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - Generated Explanation */}
          <div className="flex flex-col min-h-0 bg-white">
            <div className="px-6 py-3 border-b border-gray-200 bg-slate-50 shrink-0 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Generated Explanation
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {generatedText ? (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm prose prose-sm max-w-none [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mt-0.5 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-slate-800 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre_code]:bg-transparent [&_pre_code]:p-0 text-sm leading-relaxed text-slate-800">
                  {parse(
                    marked.parse(generatedText, {
                      breaks: true,
                    }),
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-amber-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Ready to generate
                    </p>
                    <p className="text-xs mt-1 max-w-xs mx-auto">
                      Select a Part and click &quot;Generate explanation&quot;
                      to test the system prompt on the loaded question.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white shrink-0 flex justify-end gap-3">
              <Button
                onClick={onClose}
                disabled={generating}
                className="h-9 px-5 rounded-lg border-slate-300"
              >
                Close
              </Button>
              <Button
                type="primary"
                onClick={handleGenerate}
                loading={generating}
                disabled={!selectedQuestion || generating}
                className="h-9 px-5 rounded-lg shadow-sm"
              >
                Generate explanation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SystemPromptExplanationTestModal;
