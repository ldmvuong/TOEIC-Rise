import { useState, useEffect, useRef } from "react";
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

const SystemPromptSpeakingAssessmentTestModal = ({
  open,
  onClose,
  systemPromptContent,
}) => {
  const [selectedPart, setSelectedPart] = useState(null);
  const [partOptions, setPartOptions] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedPart(null);
      setSelectedQuestion(null);
      setPartOptions([]);
      setAudioBlob(null);
      setIsRecording(false);
      setGeneratedText("");
      setGenerating(false);
    } else {
      stopRecording();
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
          .filter((opt) =>
            String(opt.value).toUpperCase().includes("SPEAKING"),
          );

        setPartOptions(nextOptions);
      } catch (error) {
        if (ignore) return;

        console.error(error);
        setPartOptions([]);
        antdMessage.error(
          error?.message || "Cannot load part list to test assessment.",
        );
      } finally {
        if (!ignore) {
          setPartsLoading(false);
        }
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
          params: {
            partName: selectedPart,
          },
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
        if (!ignore) {
          setQuestionLoading(false);
        }
      }
    };

    loadRandomQuestion();

    return () => {
      ignore = true;
    };
  }, [open, selectedPart]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        antdMessage.error(
          "Microphone access is not supported by this browser.",
        );
        return;
      }
      // If a recorder is already active, stop it first
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer a widely supported mimeType if available
      let options = {};
      if (typeof MediaRecorder !== "undefined") {
        const supports =
          typeof MediaRecorder.isTypeSupported === "function"
            ? MediaRecorder.isTypeSupported
            : null;
        if (supports && supports("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (supports && supports("audio/webm")) {
          options = { mimeType: "audio/webm" };
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioBlob(null);
    } catch (err) {
      console.error(err);
      antdMessage.error("Could not access microphone.");
    }
  };

  const handleAssess = async () => {
    if (!audioBlob) {
      antdMessage.warning("Please record an answer to assess.");
      return;
    }

    if (!selectedQuestion?.id) {
      antdMessage.warning(
        "Please select a part and wait for a question to load before assessing.",
      );
      return;
    }

    if (!systemPromptContent || systemPromptContent.trim().length < 20) {
      antdMessage.warning(
        "System prompt content is invalid. Please ensure it is at least 20 characters.",
      );
      return;
    }

    setGeneratedText("");
    setGenerating(true);

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("questionId", String(selectedQuestion.id));
    formData.append("systemPromptContent", systemPromptContent);

    try {
      const response = await api.post(
        "/staff/chatbot/testing-system-prompt-speaking-assessment",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const result = response?.data;
      setGeneratedText(result || "");
    } catch (error) {
      console.error(error);
      antdMessage.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to call AI to test the speaking assessment system prompt.",
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
      title="Test Speaking Assessment System Prompt"
      bodyStyle={{ padding: 0 }}
    >
      <div className="flex flex-col h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 flex items-center justify-between shrink-0">
          <div className="pr-4">
            <div className="text-base font-semibold text-gray-900">
              Speaking Assessment Tester
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Select a part to load a random question, record an answer, then
              assess to test the prompt.
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
                      Question #{selectedQuestion.position}
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

          {/* Right Pane - Assessment */}
          <div className="flex flex-col min-h-0 bg-white">
            <div className="px-6 py-3 border-b border-gray-200 bg-slate-50 shrink-0 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Answer & Assessment
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  User Audio Answer <span className="text-red-500">*</span>
                </div>
                <div className="flex items-center gap-3 mb-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {!isRecording ? (
                    <Button
                      type="primary"
                      onClick={startRecording}
                      disabled={generating}
                      className="bg-red-500 hover:bg-red-600 border-none shadow-sm"
                      icon={
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                      }
                    >
                      Record Audio
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      disabled={generating}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      icon={
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <rect x="5" y="5" width="10" height="10" />
                        </svg>
                      }
                    >
                      Stop Recording
                    </Button>
                  )}
                  {isRecording && (
                    <span className="text-red-500 animate-pulse flex items-center gap-2 text-sm font-medium">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      Recording...
                    </span>
                  )}
                </div>
                {audioBlob && (
                  <div className="mt-3">
                    <audio
                      src={URL.createObjectURL(audioBlob)}
                      controls
                      className="w-full h-10 outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-gray-700">
                    Assessment Result
                  </div>
                  <Button
                    type="primary"
                    onClick={handleAssess}
                    loading={generating}
                    disabled={!selectedQuestion || generating || !audioBlob}
                    className="h-8 px-4 rounded-md shadow-sm"
                  >
                    Assess Answer
                  </Button>
                </div>
                <div className="min-h-[160px] bg-slate-50 border border-slate-200 rounded-lg p-4">
                  {generating ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                      <Spin />
                      <span className="text-xs">Assessing...</span>
                    </div>
                  ) : generatedText ? (
                    <div className="prose prose-sm max-w-none [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mt-0.5 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-slate-800 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre_code]:bg-transparent [&_pre_code]:p-0 text-sm leading-relaxed text-slate-800">
                      {parse(
                        marked.parse(generatedText, {
                          breaks: true,
                        }),
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <p className="text-sm">No assessment yet.</p>
                      <p className="text-xs mt-1">
                        Record an answer and click &quot;Assess Answer&quot;.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white shrink-0 flex justify-end gap-3">
              <Button
                onClick={onClose}
                disabled={generating}
                className="h-9 px-5 rounded-lg border-slate-300"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SystemPromptSpeakingAssessmentTestModal;
