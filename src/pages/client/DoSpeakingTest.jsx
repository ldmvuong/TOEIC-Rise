import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { Modal, Spin, message } from "antd";
import MicRecorder from "mic-recorder-to-mp3";
import {
  getSpeakingExam,
  submitSpeakingTestExam,
  uploadCloudinaryAudio,
  deleteCloudinaryAudio,
} from "../../api/api";
import { buildTestResultPath } from "../../utils/testResultNavigation";
import PassageDisplay from "../../components/exam/PassageDisplay";
import DictionaryText from "../../components/shared/DictionaryText";

const FULL_TEST_SECONDS = 20 * 60;
const FULL_TEST_STORAGE_KEY_PREFIX = "toeic_full_test_progress_";

function getFullTestStorageKey(testId, learnerTestType) {
  if (learnerTestType === "speaking" || learnerTestType === "writing") {
    return `${FULL_TEST_STORAGE_KEY_PREFIX}${learnerTestType}_${testId}`;
  }
  return `${FULL_TEST_STORAGE_KEY_PREFIX}${testId}`;
}

function getQuestionTiming(partNumber, questionPosition) {
  if (partNumber === 1 && [1, 2].includes(questionPosition)) {
    return { prepare: 45, answer: 45 };
  }
  if (partNumber === 2 && [3, 4].includes(questionPosition)) {
    return { prepare: 45, answer: 30 };
  }
  if (partNumber === 3 && [5, 6, 7].includes(questionPosition)) {
    return { prepare: 3, answer: questionPosition === 7 ? 30 : 15 };
  }
  if (partNumber === 4 && [8, 9, 10].includes(questionPosition)) {
    return { prepare: 3, answer: questionPosition === 10 ? 30 : 15 };
  }
  if (partNumber === 5 && questionPosition === 11) {
    return { prepare: 30, answer: 60 };
  }
  return { prepare: 0, answer: 0 };
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parsePartNumber(partName) {
  const n = Number(String(partName || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sanitizeHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function collectSpeakingQuestionsInOrder(testData) {
  const list = [];
  (testData?.partResponses || []).forEach((part) => {
    (part.questionGroupResponses || []).forEach((group) => {
      (group.questionDetailResponses || []).forEach((q) => {
        if (q?.id != null) list.push(q);
      });
    });
  });
  return list;
}

const DoSpeakingTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const searchParams = new URLSearchParams(location.search);

  const testId = state.testId || searchParams.get("testId");
  const learnerTestType = state.learnerTestType || "speaking";
  const mode = state.mode || searchParams.get("mode") || "practice";
  const isFullTest = mode === "full";
  const partIds =
    state.parts ||
    (searchParams.get("parts")
      ? searchParams
          .get("parts")
          .split(",")
          .map((x) => Number(x.trim()))
      : [1, 2, 3, 4, 5]);

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [fullRemaining, setFullRemaining] = useState(FULL_TEST_SECONDS);
  const [phaseType, setPhaseType] = useState("prepare");
  const [phaseRemaining, setPhaseRemaining] = useState(0);
  const [groupReadDone, setGroupReadDone] = useState({});
  const [finished, setFinished] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [questionNotes, setQuestionNotes] = useState({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [micCheckComplete, setMicCheckComplete] = useState(false);
  const [micCheckRecording, setMicCheckRecording] = useState(false);
  const [micCheckEncoding, setMicCheckEncoding] = useState(false);
  const [micCheckPreviewUrl, setMicCheckPreviewUrl] = useState(null);
  const [micCheckError, setMicCheckError] = useState(null);

  const micCheckRecorderRef = useRef(null);

  const [answerAudioByQuestionId, setAnswerAudioByQuestionId] = useState({});
  const [answerRecording, setAnswerRecording] = useState(false);
  const [answerEncoding, setAnswerEncoding] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [practiceTimeSpent, setPracticeTimeSpent] = useState(0);

  const answerRecorderRef = useRef(null);
  const answerRecordingTargetIdRef = useRef(null);
  const answerRecordingRef = useRef(false);
  const answerAudioByQuestionIdRef = useRef({});

  const [answerUrlByQuestionId, setAnswerUrlByQuestionId] = useState({});
  const answerUrlByQuestionIdRef = useRef({});
  const needsUploadRef = useRef({});
  const uploadPromiseRef = useRef({});
  const [uploadingQids, setUploadingQids] = useState({});

  const isSubmittedRef = useRef(false);
  const prevPhaseTypeRef = useRef(phaseType);

  const blockerRef = useRef(null);
  const allowNavigationRef = useRef(false);
  const finishedRef = useRef(false);
  const fullTestProgressRef = useRef(null);

  const parts = testData?.partResponses || [];
  const currentPart = parts[currentPartIndex];
  const currentGroup = currentPart?.questionGroupResponses?.[currentGroupIndex];
  const questions = currentGroup?.questionDetailResponses || [];
  const currentQuestion = questions[currentQuestionIndex];
  const partNumber = parsePartNumber(currentPart?.partName);
  const questionPosition = currentQuestion?.position || 0;

  const currentQuestionRef = useRef(currentQuestion);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  const shouldBlockNav =
    !!isFullTest &&
    !!testData &&
    !finished &&
    micCheckComplete &&
    !isSubmitted;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlockNav && currentLocation.pathname !== nextLocation.pathname,
  );
  blockerRef.current = blocker;

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowLeaveConfirm(true);
      setPendingNavigation({ fromBlocker: true });
    }
  }, [blocker.state]);

  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  useEffect(() => {
    isSubmittedRef.current = isSubmitted;
  }, [isSubmitted]);

  useEffect(() => {
    answerRecordingRef.current = answerRecording;
  }, [answerRecording]);

  useEffect(() => {
    answerAudioByQuestionIdRef.current = answerAudioByQuestionId;
  }, [answerAudioByQuestionId]);

  useEffect(() => {
    if (isFullTest || finished || isSubmitted || !micCheckComplete) return;
    const timer = setInterval(() => {
      setPracticeTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isFullTest, finished, isSubmitted, micCheckComplete]);

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);

    const uploadedUrls = Object.values(answerUrlByQuestionIdRef.current).filter(Boolean);
    uploadedUrls.forEach((url) => {
      deleteCloudinaryAudio({ audioUrl: url }).catch((e) =>
        console.error("Failed to delete audio on leave", e),
      );
    });
    answerUrlByQuestionIdRef.current = {};
    setAnswerUrlByQuestionId({});

    if (isFullTest && testId && testData) {
      const key = getFullTestStorageKey(testId, learnerTestType);
      const payload = {
        testId,
        learnerTestType,
        mode: "full",
        partIds: partIds || [1, 2, 3, 4, 5],
        testData,
        fullRemaining,
        currentPartIndex,
        currentGroupIndex,
        currentQuestionIndex,
        groupReadDone,
        questionNotes,
        phaseType,
        phaseRemaining,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (e) {
        console.error("Failed to save Speaking full test progress:", e);
      }
    }
    if (
      pendingNavigation?.fromBlocker &&
      blockerRef.current?.state === "blocked"
    ) {
      allowNavigationRef.current = true;
      setPendingNavigation(null);
      blockerRef.current?.proceed();
      return;
    }
    allowNavigationRef.current = true;
    setPendingNavigation(null);
    setTimeout(() => {
      navigate("/speaking-tests", { replace: true });
    }, 0);
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
    if (
      pendingNavigation?.fromBlocker &&
      blockerRef.current?.state === "blocked"
    ) {
      blockerRef.current?.reset();
    }
    setPendingNavigation(null);
  };

  useEffect(() => {
    if (!isFullTest || !testId || !testData || finished || isSubmitted) {
      fullTestProgressRef.current = null;
      return;
    }
    fullTestProgressRef.current = {
      testId,
      learnerTestType,
      mode: "full",
      partIds: partIds || [1, 2, 3, 4, 5],
      testData,
      fullRemaining,
      currentPartIndex,
      currentGroupIndex,
      currentQuestionIndex,
      groupReadDone,
      questionNotes,
      phaseType,
      phaseRemaining,
      savedAt: Date.now(),
    };
  }, [
    isFullTest,
    testId,
    learnerTestType,
    testData,
    finished,
    partIds,
    fullRemaining,
    currentPartIndex,
    currentGroupIndex,
    currentQuestionIndex,
    groupReadDone,
    questionNotes,
    phaseType,
    phaseRemaining,
    isSubmitted,
  ]);

  useEffect(() => {
    if ((finished || isSubmitted) && showLeaveConfirm) {
      setShowLeaveConfirm(false);
      setPendingNavigation(null);
    }
  }, [finished, isSubmitted, showLeaveConfirm]);

  useEffect(() => {
    if (finished || !testData || !micCheckComplete) {
      return;
    }

    const handlePopState = () => {
      if (finishedRef.current || isSubmittedRef.current) {
        return;
      }
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return;
      }
      window.history.pushState(null, "", window.location.href);
      setShowLeaveConfirm(true);
      setPendingNavigation({ timestamp: Date.now() });
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [finished, testData, micCheckComplete]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (
        allowNavigationRef.current ||
        finishedRef.current ||
        isSubmittedRef.current
      ) {
        return;
      }
      if (!testData || !micCheckComplete) return;
      if (isFullTest && fullTestProgressRef.current) {
        try {
          const key = getFullTestStorageKey(
            fullTestProgressRef.current.testId,
            fullTestProgressRef.current.learnerTestType,
          );
          const payload = {
            ...fullTestProgressRef.current,
            savedAt: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(payload));
        } catch (err) {
          console.error(
            "Failed to save Speaking full test progress before unload:",
            err,
          );
        }
      }
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [testData, isFullTest, micCheckComplete]);

  useEffect(() => {
    return () => {
      if (micCheckPreviewUrl) {
        URL.revokeObjectURL(micCheckPreviewUrl);
      }
    };
  }, [micCheckPreviewUrl]);

  useEffect(() => {
    const init = async () => {
      if (!testId) {
        message.error("Missing Speaking test information");
        navigate("/speaking-tests");
        return;
      }
      setLoading(true);
      try {
        const res = await getSpeakingExam(testId, partIds);
        setTestData(res?.data || null);
      } catch (error) {
        message.error(error?.message || "Unable to load the Speaking test");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [testId, navigate, partIds.join(",")]);

  const currentTiming = useMemo(
    () => getQuestionTiming(partNumber, questionPosition),
    [partNumber, questionPosition],
  );

  const moveToNextQuestion = useCallback(() => {
    if (!currentPart) return false;
    const groupList = currentPart.questionGroupResponses || [];
    const questionList = currentGroup?.questionDetailResponses || [];

    if (currentQuestionIndex < questionList.length - 1) {
      setCurrentQuestionIndex((v) => v + 1);
      return true;
    }
    if (currentGroupIndex < groupList.length - 1) {
      setCurrentGroupIndex((v) => v + 1);
      setCurrentQuestionIndex(0);
      return true;
    }
    if (currentPartIndex < parts.length - 1) {
      setCurrentPartIndex((v) => v + 1);
      setCurrentGroupIndex(0);
      setCurrentQuestionIndex(0);
      return true;
    }
    return false;
  }, [
    currentPart,
    currentGroup,
    currentQuestionIndex,
    currentGroupIndex,
    currentPartIndex,
    parts.length,
  ]);

  useEffect(() => {
    if (!isFullTest || !micCheckComplete || !currentGroup) return;
    const groupId = currentGroup.id;
    const mustReadPassage =
      (partNumber === 3 || partNumber === 4) && !!currentGroup.passage;
    const hasRead = !!groupReadDone[groupId];
    if (mustReadPassage && !hasRead && currentQuestionIndex === 0) {
      setPhaseType("read-passage");
      setPhaseRemaining(partNumber === 3 ? 15 : 45);
      return;
    }
    setPhaseType("prepare");
    setPhaseRemaining(currentTiming.prepare);
  }, [
    isFullTest,
    currentGroup,
    currentGroup?.id,
    partNumber,
    currentTiming.prepare,
    groupReadDone,
    currentQuestionIndex,
    micCheckComplete,
  ]);

  useEffect(() => {
    if (!isFullTest || finished || !micCheckComplete) return;
    const timer = setInterval(() => {
      setFullRemaining((prev) => {
        if (prev <= 1) {
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFullTest, finished, micCheckComplete]);

  useEffect(() => {
    if (!isFullTest || finished || !micCheckComplete) return;
    const timer = setInterval(() => {
      setPhaseRemaining((prev) => {
        if (prev > 1) return prev - 1;

        if (phaseType === "read-passage") {
          if (currentGroup?.id) {
            setGroupReadDone((old) => ({ ...old, [currentGroup.id]: true }));
          }
          setPhaseType("prepare");
          return currentTiming.prepare;
        }

        if (phaseType === "prepare") {
          setPhaseType("answer");
          return currentTiming.answer;
        }

        const prevQid = currentQuestionRef.current?.id;
        const hasNext = moveToNextQuestion();
        if (prevQid) {
          void (async () => {
            await flushAnswerRecording();
            handleUploadAnswer(prevQid);
          })();
        }
        if (!hasNext) {
          setFinished(true);
          return 0;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    isFullTest,
    finished,
    micCheckComplete,
    phaseType,
    currentTiming.prepare,
    currentTiming.answer,
    moveToNextQuestion,
    currentGroup?.id,
  ]);

  const flushAnswerRecording = useCallback(async () => {
    const recorder = answerRecorderRef.current;
    const qid = answerRecordingTargetIdRef.current;
    
    if (!recorder || !answerRecordingRef.current || qid == null) return;

    answerRecorderRef.current = null;
    answerRecordingTargetIdRef.current = null;
    setAnswerRecording(false);

    try {
      setAnswerEncoding(true);
      const [, blob] = await recorder.stop().getMp3();
      if (blob && blob.size > 0) {
        const next = { ...answerAudioByQuestionIdRef.current, [qid]: blob };
        answerAudioByQuestionIdRef.current = next;
        setAnswerAudioByQuestionId(next);
        needsUploadRef.current[qid] = true;
      }
    } catch (e) {
      console.error(e);
      message.error(e?.message || "Unable to save the recording.");
    } finally {
      setAnswerEncoding(false);
    }
  }, []);

  const handleUploadAnswer = useCallback(async (qid) => {
    if (!needsUploadRef.current[qid]) return;

    if (uploadPromiseRef.current[qid]) {
      return uploadPromiseRef.current[qid];
    }

    const blob = answerAudioByQuestionIdRef.current[qid];
    if (!blob) return;

    const uploadTask = async () => {
      try {
        setUploadingQids((prev) => ({ ...prev, [qid]: true }));
        const oldUrl = answerUrlByQuestionIdRef.current[qid];
        if (oldUrl) {
          await deleteCloudinaryAudio({ audioUrl: oldUrl });
        }

        const fd = new FormData();
        fd.append("audio", blob, `speaking-q${qid}.mp3`);
        const res = await uploadCloudinaryAudio(fd);
        const newUrl = res?.data;

        if (newUrl) {
          const nextMap = { ...answerUrlByQuestionIdRef.current, [qid]: newUrl };
          answerUrlByQuestionIdRef.current = nextMap;
          setAnswerUrlByQuestionId(nextMap);
        }
        needsUploadRef.current[qid] = false;
      } catch (err) {
        console.error("Upload failed", err);
        message.error("Failed to upload audio to cloud.");
      } finally {
        setUploadingQids((prev) => ({ ...prev, [qid]: false }));
        delete uploadPromiseRef.current[qid];
      }
    };

    uploadPromiseRef.current[qid] = uploadTask();
    return uploadPromiseRef.current[qid];
  }, []);

  useEffect(() => {
    if (!isFullTest || !micCheckComplete) {
      prevPhaseTypeRef.current = phaseType;
      return;
    }
    const prev = prevPhaseTypeRef.current;
    prevPhaseTypeRef.current = phaseType;
    if (prev === "answer" && phaseType !== "answer") {
      void flushAnswerRecording();
    }
  }, [phaseType, isFullTest, micCheckComplete, flushAnswerRecording]);

  const submitSpeaking = useCallback(async () => {
    if (!testData || !testId || isSubmitting || isSubmitted) return;

    await flushAnswerRecording();
    const qid = currentQuestionRef.current?.id;
    if (qid && needsUploadRef.current[qid]) {
      handleUploadAnswer(qid);
    }

    setIsSubmitting(true);
    try {
      await Promise.all(Object.values(uploadPromiseRef.current));
      
      const orderedQuestions = collectSpeakingQuestionsInOrder(testData);
      const urlMap = answerUrlByQuestionIdRef.current;

      const timeSpent = isFullTest
        ? Math.max(1, FULL_TEST_SECONDS - fullRemaining)
        : Math.max(1, practiceTimeSpent);

      const payload = {
        testId: Number(testId),
        timeSpent,
        parts: isFullTest
          ? null
          : (testData.partResponses || []).map((p) => p.partName),
        answers: orderedQuestions.map((q) => ({
          questionId: q.id,
          audioUrl: urlMap[q.id] || "",
        })),
      };

      const res = await submitSpeakingTestExam(payload);
      if (res?.data) {
        setIsSubmitted(true);
        setTestResult(res.data);
        try {
          localStorage.removeItem(
            getFullTestStorageKey(testId, learnerTestType),
          );
        } catch (_) {
          /* ignore */
        }
      }
    } catch (err) {
      message.error(err?.message || "Unable to submit the Speaking test");
      setIsSubmitting(false);
    }
  }, [
    testData,
    testId,
    isSubmitting,
    isSubmitted,
    isFullTest,
    fullRemaining,
    practiceTimeSpent,
    learnerTestType,
    handleUploadAnswer,
  ]);

  useEffect(() => {
    if (!finished || isSubmitted || isSubmitting) return;
    let cancelled = false;
    void (async () => {
      await flushAnswerRecording();
      if (cancelled) return;
      await submitSpeaking();
    })();
    return () => {
      cancelled = true;
    };
  }, [finished, isSubmitted, isSubmitting, flushAnswerRecording, submitSpeaking]);

  const canGoPrevious =
    currentPartIndex > 0 || currentGroupIndex > 0 || currentQuestionIndex > 0;

  const handlePrevious = () => {
    if (isFullTest) return;
    if (!currentPart) return;
    
    const qid = currentQuestion?.id;
    if (qid) {
      void (async () => {
        await flushAnswerRecording();
        handleUploadAnswer(qid);
      })();
    }

    const groups = currentPart.questionGroupResponses || [];
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((v) => v - 1);
      return;
    }
    if (currentGroupIndex > 0) {
      const prevGroupIndex = currentGroupIndex - 1;
      const prevQuestions =
        groups[prevGroupIndex]?.questionDetailResponses?.length || 0;
      setCurrentGroupIndex(prevGroupIndex);
      setCurrentQuestionIndex(Math.max(0, prevQuestions - 1));
      return;
    }
    if (currentPartIndex > 0) {
      const prevPartIndex = currentPartIndex - 1;
      const prevGroups = parts[prevPartIndex]?.questionGroupResponses || [];
      const lastGroupIndex = Math.max(0, prevGroups.length - 1);
      const lastQuestionIndex = Math.max(
        0,
        (prevGroups[lastGroupIndex]?.questionDetailResponses?.length || 1) - 1,
      );
      setCurrentPartIndex(prevPartIndex);
      setCurrentGroupIndex(lastGroupIndex);
      setCurrentQuestionIndex(lastQuestionIndex);
    }
  };

  const handleNext = () => {
    if (isFullTest) return;
    
    const qid = currentQuestion?.id;
    if (qid) {
      void (async () => {
        await flushAnswerRecording();
        handleUploadAnswer(qid);
      })();
    }

    const hasNext = moveToNextQuestion();
    if (!hasNext) setFinished(true);
  };

  const currentQuestionNote = currentQuestion?.id
    ? questionNotes[currentQuestion.id] || ""
    : "";

  const currentAnswerBlob =
    currentQuestion?.id != null
      ? answerAudioByQuestionId[currentQuestion.id]
      : null;

  const currentAnswerPreviewUrl = useMemo(() => {
    return currentAnswerBlob ? URL.createObjectURL(currentAnswerBlob) : null;
  }, [currentAnswerBlob]);

  useEffect(() => {
    return () => {
      if (currentAnswerPreviewUrl) {
        URL.revokeObjectURL(currentAnswerPreviewUrl);
      }
    };
  }, [currentAnswerPreviewUrl]);

  const canRecordAnswer =
    !isSubmitting &&
    !isSubmitted &&
    (!isFullTest || phaseType === "answer");

  const handleAnswerRecordStart = async () => {
    if (!canRecordAnswer || answerRecording || answerEncoding) return;
    if (isFullTest && phaseType !== "answer") {
      message.warning("You can only record during answer time.");
      return;
    }
    if (!currentQuestion?.id) return;
    const recorder = new MicRecorder({ bitRate: 128 });
    answerRecorderRef.current = recorder;
    answerRecordingTargetIdRef.current = currentQuestion.id;
    try {
      await recorder.start();
      setAnswerRecording(true);
    } catch (e) {
      answerRecorderRef.current = null;
      answerRecordingTargetIdRef.current = null;
      message.error(e?.message || "Unable to start recording.");
    }
  };

  const handleAnswerRecordStop = async () => {
    await flushAnswerRecording();
  };

  const handleAnswerRecordClear = async () => {
    if (answerRecording || answerEncoding) return;
    if (!currentQuestion?.id) return;
    const qid = currentQuestion.id;

    setAnswerAudioByQuestionId((prev) => {
      const next = { ...prev };
      delete next[qid];
      answerAudioByQuestionIdRef.current = next;
      return next;
    });

    const oldUrl = answerUrlByQuestionIdRef.current[qid];
    if (oldUrl) {
      try {
        await deleteCloudinaryAudio({ audioUrl: oldUrl });
      } catch (err) {
        console.error("Failed to delete audio from cloud", err);
      }
      setAnswerUrlByQuestionId((prev) => {
        const next = { ...prev };
        delete next[qid];
        answerUrlByQuestionIdRef.current = next;
        return next;
      });
    }
    needsUploadRef.current[qid] = false;
  };

  const handleMicCheckStart = async () => {
    if (micCheckRecording || micCheckEncoding) return;
    setMicCheckError(null);
    const recorder = new MicRecorder({ bitRate: 128 });
    micCheckRecorderRef.current = recorder;
    try {
      await recorder.start();
      setMicCheckRecording(true);
    } catch (e) {
      micCheckRecorderRef.current = null;
      const denied = e?.name === "NotAllowedError";
      const msg = denied
        ? "The browser blocked microphone access. Please grant permission and try again."
        : e?.message || "Unable to start recording.";
      setMicCheckError(msg);
      message.error(msg);
    }
  };

  const handleMicCheckStop = async () => {
    const recorder = micCheckRecorderRef.current;
    if (!recorder || !micCheckRecording) return;
    setMicCheckEncoding(true);
    try {
      const [, blob] = await recorder.stop().getMp3();
      setMicCheckPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      const msg = e?.message || "Unable to create an MP3 file from the recording.";
      setMicCheckError(msg);
      message.error(msg);
    } finally {
      setMicCheckRecording(false);
      setMicCheckEncoding(false);
      micCheckRecorderRef.current = null;
    }
  };

  const handleMicCheckRetry = () => {
    if (micCheckRecording || micCheckEncoding) return;
    setMicCheckPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setMicCheckError(null);
  };

  if (loading) {
    return <Spin fullscreen tip="Loading Speaking test..." />;
  }

  if (!testData || !currentPart || !currentGroup || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Speaking test not found</div>
      </div>
    );
  }

  if (!micCheckComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 py-10">
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">
              Step 1 · Microphone check
            </p>
            <h1 className="text-xl font-semibold text-gray-900">
              {testData.testName}
            </h1>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              Before starting, record a short clip for a few seconds. The system will
              create an MP3 file so you can listen back. If the sound is clear and not distorted,
              continue. If not, record again after checking your microphone or headset connection.
            </p>

            {micCheckError ? (
              <div
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {micCheckError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleMicCheckStart}
                disabled={micCheckRecording || micCheckEncoding}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {micCheckRecording ? "Recording..." : "Start microphone test"}
              </button>
              <button
                type="button"
                onClick={handleMicCheckStop}
                disabled={!micCheckRecording || micCheckEncoding}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {micCheckEncoding ? "Creating MP3..." : "Stop"}
              </button>
              <button
                type="button"
                onClick={handleMicCheckRetry}
                disabled={
                  micCheckRecording ||
                  micCheckEncoding ||
                  !micCheckPreviewUrl
                }
                className="px-4 py-2 rounded-lg border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record again
              </button>
            </div>

            {micCheckPreviewUrl ? (
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-medium text-gray-800 mb-2">
                  Listen to the recording (MP3)
                </div>
                <audio
                  key={micCheckPreviewUrl}
                  controls
                  src={micCheckPreviewUrl}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  If you can hear your voice clearly, your microphone is working properly.
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={() => navigate("/speaking-tests")}
                className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
              >
                Back to test list
              </button>
              <button
                type="button"
                onClick={() => setMicCheckComplete(true)}
                disabled={!micCheckPreviewUrl || micCheckRecording || micCheckEncoding}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Audio is clear - start test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {testData.testName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentPart.partName} · Question {currentQuestion.position}
              </p>
            </div>
            <div className="text-right">
              {isFullTest ? (
                <>
                  <div className="text-xs text-gray-500">Full test time</div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatTime(fullRemaining)}
                  </div>
                </>
              ) : (
              <>
                <div className="text-xs text-gray-500">Elapsed time</div>
                <div className="text-lg font-semibold text-emerald-600">
                  {formatTime(practiceTimeSpent)}
                </div>
              </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5">
          {currentGroup.passage ? (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="text-sm font-medium text-amber-800 mb-2">
                Passage
              </div>
              <PassageDisplay
                passage={sanitizeHtml(currentGroup.passage)}
                disableDictionary={isFullTest}
                plain
              />
            </div>
          ) : null}

          {currentGroup.imageUrl ? (
            <div className="mb-4">
              <img
                src={currentGroup.imageUrl}
                alt="Speaking question"
                className="max-h-80 rounded-lg border"
              />
            </div>
          ) : null}

          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Question {currentQuestion.position}
          </h2>
          <DictionaryText
            className="text-gray-800 whitespace-pre-wrap"
            disableDictionary={isFullTest}
          >
            {currentQuestion.content}
          </DictionaryText>

          {isFullTest ? (
            <div className="mt-5 p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="text-sm text-blue-800">
                {phaseType === "read-passage" && "Reading passage"}
                {phaseType === "prepare" && "Preparation time"}
                {phaseType === "answer" && "Answer time"}
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {formatTime(phaseRemaining)}
              </div>
            </div>
          ) : null}

          <div className="mt-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowNoteEditor((prev) => !prev)}
                className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              >
                Write notes / outline
              </button>
            </div>

            {showNoteEditor ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes for question {currentQuestion.position}
                </label>
                <textarea
                  value={currentQuestionNote}
                  onChange={(e) =>
                    setQuestionNotes((prev) => ({
                      ...prev,
                      [currentQuestion.id]: e.target.value,
                    }))
                  }
                  placeholder="Write key ideas, vocabulary, and answer structure..."
                  className="w-full min-h-[120px] rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            ) : null}

            <div className="text-sm font-medium text-gray-700 mb-2">Record your answer</div>
            <p className="text-xs text-gray-500 mb-3">
              {isFullTest
                ? "During answer time, click Start Recording, then Stop and save the MP3 before time runs out."
                : "Record each question if you want; you can skip questions. Listen back, delete, or record again before submitting."}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={handleAnswerRecordStart}
                disabled={
                  !canRecordAnswer ||
                  answerRecording ||
                  answerEncoding ||
                  isSubmitting ||
                  isSubmitted ||
                  uploadingQids[currentQuestion?.id]
                }
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingQids[currentQuestion?.id]
                  ? "Uploading..."
                  : answerRecording
                    ? "Recording..."
                    : "Start recording"}
              </button>
              <button
                type="button"
                onClick={handleAnswerRecordStop}
                disabled={
                  !answerRecording || answerEncoding || isSubmitting || isSubmitted
                }
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {answerEncoding ? "Creating MP3..." : "Stop and save MP3"}
              </button>
              <button
                type="button"
                onClick={handleAnswerRecordClear}
                disabled={
                  answerRecording ||
                  answerEncoding ||
                  !currentAnswerBlob ||
                  isSubmitting ||
                  isSubmitted ||
                  uploadingQids[currentQuestion?.id]
                }
                className="px-4 py-2 rounded-lg border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete this recording
              </button>
            </div>
            {currentAnswerPreviewUrl ? (
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-xs font-medium text-gray-600 mb-1">
                  Listen to question {currentQuestion.position}
                </div>
                <audio
                  key={currentAnswerPreviewUrl}
                  controls
                  src={currentAnswerPreviewUrl}
                  className="w-full max-h-10"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoPrevious || isFullTest || isSubmitting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50"
          >
            Previous question
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isFullTest || isSubmitting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            Next question
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() =>
              Modal.confirm({
                title: "Confirm Submission",
                content:
                  "Are you sure you want to submit the Speaking test? Questions without recordings will be submitted without audio files.",
                okText: "Submit",
                cancelText: "Continue",
                onOk: async () => {
                  await flushAnswerRecording();
                  await submitSpeaking();
                },
              })
            }
            disabled={isSubmitting || isSubmitted}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : isSubmitted ? "Submitted" : "Submit"}
          </button>
        </div>
      </div>

      {testResult ? (
        <Modal
          title="Speaking Test Submitted"
          open={!!testResult}
          onOk={() =>
            navigate(
              buildTestResultPath(testResult.userTestId, {
                forceSpeaking: true,
              }),
            )
          }
          onCancel={() =>
            navigate(
              buildTestResultPath(testResult.userTestId, {
                forceSpeaking: true,
              }),
            )
          }
          okText="View Result"
          cancelText="Close"
          width={560}
          centered
        >
          <div className="py-3 space-y-3 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Total questions</span>
              <span className="font-semibold">{testResult.totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span>Submitted answers</span>
              <span className="font-semibold">{testResult.totalAnswers}</span>
            </div>
            <div className="flex justify-between">
              <span>Time spent (seconds)</span>
              <span className="font-semibold">{testResult.timeSpent}</span>
            </div>
          </div>
        </Modal>
      ) : null}

      <Modal
        title="Confirm Leaving Page"
        open={showLeaveConfirm}
        onOk={handleConfirmLeave}
        onCancel={handleCancelLeave}
        okText="Exit"
        cancelText="Continue Test"
        okType="danger"
      >
        <p>Are you sure you want to leave the test page?</p>
        {isFullTest ? (
          <p className="text-blue-600 font-medium mt-2">
            Your progress will be saved. You can continue the test when you return by choosing
            the same full test again.
          </p>
        ) : (
          <p className="text-red-600 font-medium mt-2">
            Note: Your test progress will not be saved if you leave this page.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default DoSpeakingTest;
