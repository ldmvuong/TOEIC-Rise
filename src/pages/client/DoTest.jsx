import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import {
  getTestExam,
  submitTestExam,
  submitWrongAnswerExam,
} from "../../api/api";
import QuestionGroup from "../../components/exam/question.group";
import Sidebar from "../../components/exam/sidebar";
import NavigationButtons from "../../components/exam/NavigationButtons";
import PartInstructions from "../../components/exam/PartInstructions";
import { useTestNavigation } from "../../hooks/useTestNavigation";
import { useAudio } from "../../hooks/useAudio";
import { scrollToElement } from "../../utils/scrollUtils";
import { message, Modal } from "antd";

const FULL_TEST_STORAGE_KEY_PREFIX = "toeic_full_test_progress_";

const DoTest = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Lấy testId và các params từ location state (nếu có) hoặc fallback về query params
  const state = location.state || {};
  const searchParams = new URLSearchParams(location.search);

  const preloadedTestData = state.preloadedTestData || null;
  const wrongUserTestId = state.wrongUserTestId || null;
  const testId =
    state.testId || preloadedTestData?.id || searchParams.get("testId");
  const mode = state.mode || searchParams.get("mode") || "practice";
  const partIds =
    state.parts ||
    (searchParams.get("parts")
      ? searchParams
          .get("parts")
          .split(",")
          .map((id) => parseInt(id.trim()))
      : [1, 2, 3, 4, 5, 6, 7]);
  const timeLimit = state.timeLimit || searchParams.get("timeLimit");
  const timeLimitMinutes =
    timeLimit !== undefined && timeLimit !== null && timeLimit !== ""
      ? Number(timeLimit)
      : null;

  // State
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionGroupIndex, setCurrentQuestionGroupIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0); // giây - thời gian còn lại
  const [elapsedTime, setElapsedTime] = useState(0); // giây - thời gian làm bài
  const [volume, setVolume] = useState(1);
  const [showInstructions, setShowInstructions] = useState(false); // Hiển thị hướng dẫn
  const [viewedParts, setViewedParts] = useState([]); // Track các part đã xem hướng dẫn (dùng array thay vì Set)
  const [startTime, setStartTime] = useState(null); // Thời điểm bắt đầu làm bài
  const [testResult, setTestResult] = useState(null); // Kết quả bài làm
  const [isTestSubmitted, setIsTestSubmitted] = useState(false); // Đánh dấu đã nộp bài
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false); // Hiển thị xác nhận rời khỏi trang
  const [pendingNavigation, setPendingNavigation] = useState(null); // Lưu navigation đang chờ xác nhận

  // Refs để lưu interval và tránh tạo lại mỗi lần render
  const timerIntervalRef = useRef(null);
  const elapsedTimeIntervalRef = useRef(null);
  const submitTestRef = useRef(null);
  const timerInitializedRef = useRef(false);
  const isTestSubmittedRef = useRef(false);
  const allowNavigationRef = useRef(false); // Flag để cho phép navigation khi người dùng xác nhận rời khỏi
  const blockerRef = useRef(null); // Ref tới blocker (điều hướng trong app) để gọi proceed/reset
  const fullTestProgressRef = useRef(null); // Payload lưu full test (dùng trong beforeunload)

  const isFullTest = mode === "full";
  const isRedoWrongMode = mode === "wrong";
  const hasTimeLimit = isFullTest || (timeLimitMinutes && timeLimitMinutes > 0);

  // Chặn điều hướng trong app (Link, navigate) khi đang làm full test chưa nộp bài
  const shouldBlockNav = !!isFullTest && !!testData && !isTestSubmitted;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlockNav && currentLocation.pathname !== nextLocation.pathname,
  );
  blockerRef.current = blocker;

  // Khi blocker chặn điều hướng → hiển thị modal xác nhận
  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowLeaveConfirm(true);
      setPendingNavigation({ fromBlocker: true });
    }
  }, [blocker.state]);
  // Xác định part hiện tại có phải phần nghe (1-4) không
  const isListeningPart = () => {
    if (!testData?.partResponses?.[currentPartIndex]) return false;
    const partName = testData.partResponses[currentPartIndex].partName;
    const partNumber = parseInt(partName.replace("Part ", ""));
    return partNumber >= 1 && partNumber <= 4;
  };

  const canNavigate = isRedoWrongMode ? true : !isListeningPart();

  // Sử dụng custom hook cho navigation
  const {
    moveToNextGroup: moveToNextGroupHook,
    moveToPreviousGroup: moveToPreviousGroupHook,
  } = useTestNavigation(
    testData,
    currentPartIndex,
    currentQuestionGroupIndex,
    setCurrentPartIndex,
    setCurrentQuestionGroupIndex,
  );

  // Di chuyển đến nhóm câu hỏi tiếp theo - với message handling
  const moveToNextGroup = useCallback(() => {
    const result = moveToNextGroupHook();
    if (result === false) {
      message.info("Bạn đã hoàn thành tất cả câu hỏi!");
    }
  }, [moveToNextGroupHook]);

  // Di chuyển đến nhóm câu hỏi trước đó - không cho phép quay lại listening parts
  const moveToPreviousGroup = useCallback(() => {
    if (!testData) return;

    const currentPart = testData.partResponses?.[currentPartIndex];
    if (!currentPart) return;

    // Kiểm tra xem part hiện tại có phải reading part (Part 5-7) không
    const currentPartName = currentPart.partName;
    const currentPartNumber = parseInt(currentPartName.replace("Part ", ""));
    const isCurrentReading = currentPartNumber >= 5 && currentPartNumber <= 7;

    // Nếu đang ở reading part và đang ở question group đầu tiên
    if (isCurrentReading && currentQuestionGroupIndex === 0) {
      // Kiểm tra part trước đó có phải listening part không
      if (currentPartIndex > 0) {
        const prevPart = testData.partResponses[currentPartIndex - 1];
        if (prevPart) {
          const prevPartName = prevPart.partName;
          const prevPartNumber = parseInt(prevPartName.replace("Part ", ""));
          const isPrevListening = prevPartNumber >= 1 && prevPartNumber <= 4;

          // Không cho phép quay lại listening parts
          if (isPrevListening) {
            return;
          }
        }
      }
    }

    // Gọi hook navigation
    moveToPreviousGroupHook();
  }, [
    testData,
    currentPartIndex,
    currentQuestionGroupIndex,
    moveToPreviousGroupHook,
  ]);

  // Gọi API lấy đề thi - hoặc khôi phục từ localStorage (full test)
  useEffect(() => {
    const initTest = async () => {
      // Case 1: redo-wrong dùng preloadedTestData trực tiếp
      if (preloadedTestData) {
        setLoading(true);
        setTestData(preloadedTestData);

        if (isFullTest) {
          setTimeRemaining(120 * 60);
        } else if (timeLimitMinutes && timeLimitMinutes > 0) {
          setTimeRemaining(timeLimitMinutes * 60);
        } else {
          setTimeRemaining(0);
        }

        setStartTime(Date.now());
        setCurrentPartIndex(0);
        setCurrentQuestionGroupIndex(0);
        setAnswers({});
        setFlaggedQuestions([]);
        setViewedParts([]);
        setIsTestSubmitted(false);
        setTestResult(null);
        setLoading(false);
        return;
      }

      if (!testId) {
        message.error("Thiếu thông tin đề thi");
        navigate("/online-tests");
        return;
      }

      if (!partIds || partIds.length === 0) {
        message.error("Vui lòng chọn ít nhất một phần");
        navigate(-1);
        return;
      }

      // Case 2: full test - khôi phục progress từ localStorage
      if (isFullTest) {
        const key = `${FULL_TEST_STORAGE_KEY_PREFIX}${testId}`;
        try {
          const raw = localStorage.getItem(key);
          const hasProgress = typeof raw === "string" && raw.trim() !== "";

          if (hasProgress) {
            let saved = null;
            try {
              saved = JSON.parse(raw);
            } catch (parseError) {
              console.error("Lỗi parse localStorage full test:", parseError);
              // Dữ liệu localStorage bị lỗi -> xóa để tránh logic treo
              localStorage.removeItem(key);
            }

            if (saved?.testId == testId && saved?.testData) {
              // Không hiển thị modal ở DoTest: tự động khôi phục tiến độ
              setTestData(saved.testData);
              setAnswers(saved.answers || {});
              setFlaggedQuestions(saved.flaggedQuestions || []);
              setCurrentPartIndex(saved.currentPartIndex ?? 0);
              setCurrentQuestionGroupIndex(
                saved.currentQuestionGroupIndex ?? 0,
              );
              setViewedParts(saved.viewedParts || []);
              setStartTime(saved.startTime ?? Date.now());

              const now = Date.now();
              const savedAt = saved.savedAt || now;
              const elapsedSinceSave = (now - savedAt) / 1000;
              const newTimeRemaining = Math.max(
                0,
                Math.floor((saved.timeRemaining || 0) - elapsedSinceSave),
              );

              // Nếu đã hết giờ: đặt 1 để sau 1 giây timer effect tự động nộp bài
              setTimeRemaining(newTimeRemaining <= 0 ? 1 : newTimeRemaining);
              setIsTestSubmitted(false);
              setTestResult(null);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("Khôi phục tiến độ full test thất bại:", e);
        }
      }

      // Case 3: lấy đề từ API
      setLoading(true);
      try {
        const res = await getTestExam(testId, partIds);
        if (res && res.data) {
          setTestData(res.data);

          if (isFullTest) {
            setTimeRemaining(120 * 60); // 120 phút
          } else if (timeLimitMinutes && timeLimitMinutes > 0) {
            setTimeRemaining(timeLimitMinutes * 60);
          } else {
            setTimeRemaining(0);
          }

          // Reset state cho session mới
          setCurrentPartIndex(0);
          setCurrentQuestionGroupIndex(0);
          setAnswers({});
          setFlaggedQuestions([]);
          setViewedParts([]);

          setStartTime(Date.now());
          setIsTestSubmitted(false);
          setTestResult(null);
        } else {
          message.error("Dữ liệu đề thi không hợp lệ");
        }
      } catch (error) {
        message.error(error?.message || "Không thể tải đề thi");
      } finally {
        setLoading(false);
      }
    };

    initTest();
  }, [
    testId,
    partIds.join(","),
    timeLimitMinutes,
    mode,
    navigate,
    preloadedTestData,
    isFullTest,
  ]);

  // Hàm dừng tất cả audio
  const stopAllAudio = useCallback(() => {
    // Tìm tất cả các audio elements trong DOM và dừng chúng
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }, []);

  // Hàm nộp bài - được tách ra để tái sử dụng
  const submitTest = useCallback(async () => {
    if (!testData || !testId || isTestSubmitted) {
      if (isTestSubmitted) {
        message.info("Bài thi đã được nộp rồi!");
      } else {
        message.error("Không có dữ liệu đề thi");
      }
      return;
    }

    // Dừng tất cả audio khi nộp bài
    stopAllAudio();

    try {
      // Thu thập tất cả câu hỏi từ tất cả các part
      const allAnswers = [];

      testData.partResponses.forEach((part) => {
        part.questionGroups.forEach((group) => {
          group.questions.forEach((question) => {
            // Lấy câu trả lời từ state, convert từ index (0,1,2,3) sang chữ cái (A,B,C,D)
            let answerValue = "";
            if (answers[question.id] !== undefined) {
              const optionIndex = answers[question.id];
              // Convert index sang chữ cái: 0 -> A, 1 -> B, 2 -> C, 3 -> D
              answerValue = String.fromCharCode(65 + optionIndex);
            }

            allAnswers.push({
              questionId: question.id,
              questionGroupId: group.id,
              answer: answerValue,
            });
          });
        });
      });

      // Xây dựng mảng parts - null nếu là full test, ngược lại là mảng các part name
      const partsArray = isFullTest
        ? null
        : testData.partResponses.map((part) => part.partName);

      // Xây dựng payload
      const payload = {
        testId: parseInt(testId),
        timeSpent: elapsedTime,
        parts: partsArray,
        answers: allAnswers,
      };

      // Gọi API theo mode
      if (isRedoWrongMode && wrongUserTestId) {
        const response = await submitWrongAnswerExam(wrongUserTestId, payload);
        if (response && response.data) {
          setIsTestSubmitted(true);
          setTimeRemaining(0);
          // Điều hướng sang trang RedoWrong với dữ liệu chi tiết
          navigate(`/redo-wrong/${wrongUserTestId}`, {
            replace: true,
            state: {
              redoResult: response.data,
            },
          });
        }
      } else {
        const response = await submitTestExam(payload);

        // Nếu thành công (status 200), lưu kết quả và hiển thị popup
        if (response && response.data) {
          // Dừng timer
          setIsTestSubmitted(true);
          setTimeRemaining(0);

          // Xóa tiến độ full test đã lưu (nếu có)
          if (isFullTest && testId) {
            try {
              localStorage.removeItem(
                `${FULL_TEST_STORAGE_KEY_PREFIX}${testId}`,
              );
            } catch (e) {
              console.error("Xóa tiến độ full test thất bại:", e);
            }
          }

          // Lưu kết quả
          setTestResult(response.data);
        }
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể nộp bài. Vui lòng thử lại.",
      );
    }
  }, [
    testData,
    testId,
    answers,
    isFullTest,
    elapsedTime,
    isTestSubmitted,
    stopAllAudio,
    isRedoWrongMode,
    wrongUserTestId,
    navigate,
  ]);

  // Cập nhật ref mỗi khi submitTest thay đổi
  useEffect(() => {
    submitTestRef.current = submitTest;
  }, [submitTest]);

  // Nộp bài với xác nhận
  const handleSubmit = () => {
    Modal.confirm({
      title: "Xác nhận nộp bài",
      content:
        "Bạn có chắc chắn muốn nộp bài? Sau khi nộp bài, bạn không thể chỉnh sửa câu trả lời.",
      okText: "Nộp bài",
      cancelText: "Tiếp tục làm bài",
      okType: "primary",
      onOk: () => {
        submitTest();
      },
      onCancel: () => {
        // Không làm gì, tiếp tục làm bài
      },
    });
  };

  // Xử lý xác nhận rời khỏi trang (nút Thoát trong modal)
  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    // Nếu là full test thì lưu tiến độ vào localStorage trước khi thoát
    if (isFullTest && testId && testData) {
      const key = `${FULL_TEST_STORAGE_KEY_PREFIX}${testId}`;
      const payload = {
        testId,
        mode: "full",
        partIds: partIds || [1, 2, 3, 4, 5, 6, 7],
        timeLimit: null,
        testData,
        answers,
        flaggedQuestions,
        timeRemaining,
        savedAt: Date.now(),
        startTime,
        currentPartIndex,
        currentQuestionGroupIndex,
        viewedParts,
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (e) {
        console.error("Lưu tiến độ full test thất bại:", e);
      }
    }
    // Nếu đang chặn điều hướng trong app (Link/navigate) → cho phép đi tới trang đích
    if (
      pendingNavigation?.fromBlocker &&
      blockerRef.current?.state === "blocked"
    ) {
      allowNavigationRef.current = true;
      setPendingNavigation(null);
      blockerRef.current?.proceed();
      return;
    }
    // Nút Back / popstate → về trang danh sách đề thi
    allowNavigationRef.current = true;
    setPendingNavigation(null);
    setTimeout(() => {
      navigate("/online-tests", { replace: true });
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

  // Cập nhật ref tiến độ full test để lưu khi beforeunload (đóng tab/F5)
  useEffect(() => {
    if (!isFullTest || !testId || !testData || isTestSubmitted) {
      fullTestProgressRef.current = null;
      return;
    }
    fullTestProgressRef.current = {
      testId,
      mode: "full",
      partIds: partIds || [1, 2, 3, 4, 5, 6, 7],
      timeLimit: null,
      testData,
      answers,
      flaggedQuestions,
      timeRemaining,
      savedAt: Date.now(),
      startTime,
      currentPartIndex,
      currentQuestionGroupIndex,
      viewedParts,
    };
  }, [
    isFullTest,
    testId,
    testData,
    isTestSubmitted,
    partIds,
    answers,
    flaggedQuestions,
    timeRemaining,
    startTime,
    currentPartIndex,
    currentQuestionGroupIndex,
    viewedParts,
  ]);

  // Đóng modal xác nhận nếu đã nộp bài
  useEffect(() => {
    if (isTestSubmitted && showLeaveConfirm) {
      setShowLeaveConfirm(false);
      setPendingNavigation(null);
    }
  }, [isTestSubmitted, showLeaveConfirm]);

  // Cập nhật ref khi isTestSubmitted thay đổi
  useEffect(() => {
    isTestSubmittedRef.current = isTestSubmitted;
  }, [isTestSubmitted]);

  // Chặn navigation trong app khi chưa nộp bài (back/forward button, programmatic navigation)
  useEffect(() => {
    if (isTestSubmitted || !testData) {
      // Nếu đã nộp bài, không chặn navigation
      return;
    }

    // Lắng nghe popstate (back/forward button)
    const handlePopState = () => {
      // Kiểm tra lại isTestSubmitted bằng ref (luôn có giá trị mới nhất)
      // Nếu đã nộp bài, cho phép navigation
      if (isTestSubmittedRef.current) {
        return;
      }

      // Nếu đã được phép navigation (người dùng đã xác nhận rời khỏi), cho phép
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false; // Reset flag
        return;
      }

      // Ngăn chặn navigation mặc định bằng cách push state lại
      window.history.pushState(null, "", window.location.href);

      // Hiển thị modal xác nhận
      setShowLeaveConfirm(true);
      setPendingNavigation({
        // Lưu thông tin để có thể sử dụng nếu cần
        timestamp: Date.now(),
      });
    };

    // Push một state để có thể intercept back button
    window.history.pushState(null, "", window.location.href);

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isTestSubmitted, testData]);

  // Xử lý beforeunload event (đóng tab/trình duyệt, F5)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (allowNavigationRef.current || isTestSubmitted) {
        return;
      }
      if (!testData) return;
      // Full test: lưu tiến độ trước khi hiện dialog (đóng tab/F5 vẫn giữ bài làm)
      if (isFullTest && fullTestProgressRef.current) {
        try {
          const key = `${FULL_TEST_STORAGE_KEY_PREFIX}${fullTestProgressRef.current.testId}`;
          const payload = {
            ...fullTestProgressRef.current,
            savedAt: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(payload));
        } catch (err) {
          console.error("Lưu tiến độ full test (beforeunload) thất bại:", err);
        }
      }
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTestSubmitted, testData, isFullTest]);

  // Timer countdown - đếm ngược thời gian còn lại (nếu có giới hạn)
  useEffect(() => {
    // Xóa interval cũ nếu có
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerInitializedRef.current = false;

    // Chỉ tạo interval nếu có giới hạn thời gian và chưa nộp bài
    if (!hasTimeLimit || isTestSubmitted) {
      return;
    }

    // Tạo interval mới - chỉ tạo một lần, sử dụng functional update
    timerInitializedRef.current = true;
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        // Chỉ đếm nếu thời gian còn lại > 0
        if (prev <= 0) {
          return prev;
        }

        if (prev <= 1) {
          // Hết thời gian - tự động nộp bài
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          timerInitializedRef.current = false;
          // Sử dụng ref để tránh dependency
          if (submitTestRef.current) {
            setTimeout(() => {
              submitTestRef.current("Hết thời gian! Đã tự động nộp bài.");
            }, 100);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      timerInitializedRef.current = false;
    };
  }, [hasTimeLimit, isTestSubmitted]);

  // Đếm thời gian làm bài (elapsed time) - luôn chạy
  useEffect(() => {
    // Xóa interval cũ nếu có
    if (elapsedTimeIntervalRef.current) {
      clearInterval(elapsedTimeIntervalRef.current);
      elapsedTimeIntervalRef.current = null;
    }

    // Chỉ tạo interval nếu đã bắt đầu và chưa nộp bài
    if (!startTime || isTestSubmitted) {
      return;
    }

    // Tạo interval mới
    elapsedTimeIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
    };
  }, [startTime, isTestSubmitted]);

  // Xử lý audio tự động cho Part 1-4
  // Chỉ phát audio khi không đang hiển thị instructions
  const currentPartForAudio = testData?.partResponses?.[currentPartIndex];
  const currentGroupForAudio =
    currentPartForAudio?.questionGroups?.[currentQuestionGroupIndex];
  const shouldPlayAudio =
    testData &&
    isListeningPart() &&
    currentGroupForAudio?.audioUrl &&
    !showInstructions;

  useAudio(
    shouldPlayAudio ? currentGroupForAudio : null,
    volume,
    moveToNextGroup,
  );

  // Tính toán partNumber trước khi dùng trong useEffect
  const currentPart = testData?.partResponses?.[currentPartIndex];
  const partNumber = currentPart
    ? parseInt(currentPart.partName.replace("Part ", ""))
    : 0;

  // Kiểm tra xem có cần hiển thị hướng dẫn không (cho tất cả các part)
  // Phải đặt useEffect trước các early returns để tuân thủ quy tắc hooks
  useEffect(() => {
    if (!testData || loading || partNumber === 0) return;

    // Hiển thị hướng dẫn cho tất cả các part (1-7) khi vào lần đầu
    const shouldShowInstructions =
      partNumber >= 1 &&
      partNumber <= 7 &&
      !viewedParts.includes(partNumber) &&
      currentQuestionGroupIndex === 0;

    if (shouldShowInstructions) {
      setShowInstructions(true);
    } else {
      setShowInstructions(false);
    }
  }, [testData, partNumber, currentQuestionGroupIndex, viewedParts, loading]);

  // Xử lý thay đổi câu trả lời
  const handleQuestionChange = (updatedQuestion) => {
    setAnswers((prev) => ({
      ...prev,
      [updatedQuestion.id]: updatedQuestion.selectedOption,
    }));
  };

  // Toggle flag câu hỏi
  const handleToggleFlag = (questionId) => {
    setFlaggedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  // Navigate đến câu hỏi cụ thể và scroll đến câu đó
  const handleNavigateToQuestion = (partIndex, groupId, questionId) => {
    const part = testData?.partResponses?.[partIndex];
    if (!part) return;

    // Kiểm tra xem part này có phải listening part (Part 1-4) không
    const partName = part.partName;
    const partNumber = parseInt(partName.replace("Part ", ""));
    const isPartListening = partNumber >= 1 && partNumber <= 4;

    // Trong full test: không cho phép navigate đến listening parts.
    // Trong "wrong" mode (làm lại câu sai): cho phép tự do chuyển câu.
    if (isPartListening && !isRedoWrongMode) {
      return;
    }

    // Chỉ cho phép navigate nếu canNavigate = true
    if (!canNavigate) return;

    const groupIndex = part.questionGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) return;

    setCurrentPartIndex(partIndex);
    setCurrentQuestionGroupIndex(groupIndex);

    // Scroll đến câu hỏi sau khi component đã render
    scrollToElement(`question-${questionId}`, {
      behavior: "smooth",
      block: "center",
    });
  };

  // Xử lý khi người dùng ấn OK để tiếp tục
  const handleContinueFromInstructions = () => {
    setShowInstructions(false);
    setViewedParts((prev) => {
      if (!prev.includes(partNumber)) {
        return [...prev, partNumber];
      }
      return prev;
    });
  };

  // Đóng popup kết quả và navigate về trang kết quả bài thi
  const handleCloseResultModal = () => {
    if (testResult && testResult.userTestId) {
      navigate(`/test-result/${testResult.userTestId}`);
    } else {
      // Fallback nếu không có userTestId
      setTestResult(null);
      if (testId) {
        navigate(`/online-tests/${testId}`);
      } else {
        navigate("/online-tests");
      }
    }
  };

  // Navigate đến trang kết quả chi tiết
  const handleViewDetailedResult = () => {
    if (testResult && testResult.userTestId) {
      navigate(`/test-result/${testResult.userTestId}`);
    } else {
      message.error("Không tìm thấy ID bài thi");
    }
  };

  // Format thời gian từ giây sang phút:giây
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải đề thi...</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Không tìm thấy đề thi</div>
      </div>
    );
  }

  const currentGroup = currentPart?.questionGroups?.[currentQuestionGroupIndex];

  // Cập nhật answers cho currentGroup
  const updatedGroup = currentGroup
    ? {
        ...currentGroup,
        questions: currentGroup.questions.map((q) => ({
          ...q,
          selectedOption:
            answers[q.id] !== undefined ? answers[q.id] : q.selectedOption,
        })),
      }
    : null;

  // Hiển thị hướng dẫn nếu cần (cho tất cả các part 1-7)
  if (showInstructions && partNumber >= 1 && partNumber <= 7) {
    return (
      <div className="h-screen flex overflow-hidden bg-gray-50">
        {/* Main Content - 85% */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ width: "85%" }}
        >
          <PartInstructions
            partNumber={partNumber}
            onContinue={handleContinueFromInstructions}
            isListeningPart={isListeningPart()}
          />
        </div>

        {/* Sidebar - 15% */}
        <div style={{ width: "15%", minWidth: "250px" }}>
          <Sidebar
            timeRemaining={timeRemaining}
            elapsedTime={elapsedTime}
            hasTimeLimit={hasTimeLimit}
            parts={testData.partResponses}
            currentQuestionGroupIndex={currentQuestionGroupIndex}
            currentPartIndex={currentPartIndex}
            onNavigateToQuestion={handleNavigateToQuestion}
            onSubmit={handleSubmit}
            volume={volume}
            onVolumeChange={setVolume}
            canNavigate={canNavigate}
            flaggedQuestions={flaggedQuestions}
            answers={answers}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Main Content - 85% */}
      <div className="flex-1 flex flex-col" style={{ width: "85%" }}>
        <div
          className={`flex-1 flex flex-col relative ${partNumber >= 6 && partNumber <= 7 ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {updatedGroup && (
            <>
              {/* Question Group Container - thêm padding-bottom cho Part 5-7 để không bị che bởi fixed buttons */}
              <div
                className={`flex-1 ${partNumber >= 6 && partNumber <= 7 ? "min-h-0 overflow-hidden p-6" : `overflow-y-auto p-6 ${partNumber >= 5 && partNumber <= 7 ? "pb-32" : ""}`}`}
              >
                <div
                  className={
                    partNumber >= 6 && partNumber <= 7
                      ? "h-full"
                      : "max-w-4xl mx-auto w-full"
                  }
                >
                  <QuestionGroup
                    questionGroup={updatedGroup}
                    onQuestionChange={handleQuestionChange}
                    partNumber={partNumber}
                    flaggedQuestions={flaggedQuestions}
                    onToggleFlag={handleToggleFlag}
                    partName={currentPart?.partName || ""}
                    isListeningPart={isListeningPart()}
                    disableDictionary={isFullTest}
                    showAudioControl={
                      isRedoWrongMode && partNumber >= 1 && partNumber <= 4
                    }
                    volume={volume}
                  />
                </div>
              </div>

              {/* Navigation buttons cho Part 5-7 - fixed ở cuối màn hình viewport */}
              {canNavigate &&
                partNumber >= 5 &&
                partNumber <= 7 &&
                (() => {
                  // Kiểm tra có thể quay lại không
                  let canGoPrevious = !(
                    currentPartIndex === 0 && currentQuestionGroupIndex === 0
                  );

                  // Nếu đang ở question group đầu tiên
                  if (currentQuestionGroupIndex === 0) {
                    // Kiểm tra part trước đó có phải listening part không
                    if (currentPartIndex > 0) {
                      const prevPart =
                        testData.partResponses[currentPartIndex - 1];
                      if (prevPart) {
                        const prevPartName = prevPart.partName;
                        const prevPartNumber = parseInt(
                          prevPartName.replace("Part ", ""),
                        );
                        const isPrevListening =
                          prevPartNumber >= 1 && prevPartNumber <= 4;

                        // Không cho phép quay lại listening parts
                        if (isPrevListening) {
                          canGoPrevious = false;
                        }
                      }
                    }
                  }

                  return (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4">
                      <div className="pointer-events-auto bg-white/95 border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-3">
                        <NavigationButtons
                          onPrevious={moveToPreviousGroup}
                          onNext={moveToNextGroup}
                          canGoPrevious={canGoPrevious}
                          canGoNext={
                            !(
                              currentPartIndex ===
                                testData.partResponses.length - 1 &&
                              currentQuestionGroupIndex ===
                                currentPart.questionGroups.length - 1
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })()}
            </>
          )}
        </div>
      </div>

      {/* Sidebar - 15% */}
      <div style={{ width: "15%", minWidth: "250px" }}>
        <Sidebar
          timeRemaining={timeRemaining}
          elapsedTime={elapsedTime}
          hasTimeLimit={hasTimeLimit}
          parts={testData.partResponses}
          currentQuestionGroupIndex={currentQuestionGroupIndex}
          currentPartIndex={currentPartIndex}
          onNavigateToQuestion={handleNavigateToQuestion}
          onSubmit={handleSubmit}
          volume={volume}
          onVolumeChange={setVolume}
          canNavigate={canNavigate}
          allowListeningNavigation={isRedoWrongMode}
          flaggedQuestions={flaggedQuestions}
          answers={answers}
        />
      </div>

      {/* Modal hiển thị kết quả bài làm */}
      {testResult && (
        <Modal
          title="Kết quả bài làm"
          open={!!testResult}
          onOk={handleViewDetailedResult}
          onCancel={handleCloseResultModal}
          okText="Xem chi tiết"
          cancelText="Đóng"
          width={600}
          centered
        >
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-gray-700 font-medium">
                  Tổng số câu hỏi:
                </span>
                <span className="text-lg font-semibold text-blue-600">
                  {testResult.totalQuestions}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="text-gray-700 font-medium">Số câu đúng:</span>
                <span className="text-lg font-semibold text-green-600">
                  {testResult.correctAnswers}
                </span>
              </div>

              {testResult.score ? (
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-gray-700 font-medium">Điểm số:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {testResult.score}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-gray-700 font-medium">
                  Thời gian làm bài:
                </span>
                <span className="text-lg font-semibold text-orange-600">
                  {formatTime(testResult.timeSpent)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800 mb-2">
                    {testResult.totalQuestions > 0
                      ? `${Math.round((testResult.correctAnswers / testResult.totalQuestions) * 100)}%`
                      : "0%"}
                  </div>
                  <div className="text-sm text-gray-600">Tỷ lệ đúng</div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal xác nhận rời khỏi trang */}
      <Modal
        title="Xác nhận rời khỏi trang"
        open={showLeaveConfirm}
        onOk={handleConfirmLeave}
        onCancel={handleCancelLeave}
        okText="Thoát"
        cancelText="Tiếp tục làm bài"
        okType="danger"
      >
        <p>Bạn có chắc chắn muốn rời khỏi trang làm bài?</p>
        {isFullTest ? (
          <p className="text-blue-600 font-medium mt-2">
            Tiến độ sẽ được lưu. Bạn có thể tiếp tục làm bài khi quay lại (chọn
            lại làm full test cùng đề).
          </p>
        ) : (
          <p className="text-red-600 font-medium mt-2">
            Lưu ý: Tiến độ làm bài sẽ không được lưu nếu bạn rời khỏi trang.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default DoTest;
