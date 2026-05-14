import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Spin, Modal, Button, message } from "antd";
import useLearningPath from "@/hooks/useLearningPath";
import {
  getLevelLearningPath,
  createUserLearningPath,
  getLearningPathDetail,
} from "@/api/api";

const LEVEL_CHECK_TEST_TYPES = new Set([
  "LISTENING_AND_READING",
  "SPEAKING",
  "WRITING",
  "MINI_TEST",
]);

function resolveLevelCheckTestType(path) {
  if (!path || typeof path !== "object") return "LISTENING_AND_READING";
  const fromApi = path.testType;
  if (typeof fromApi === "string" && LEVEL_CHECK_TEST_TYPES.has(fromApi)) {
    return fromApi;
  }
  const blob = [path.slug, path.title, path.name, path.description]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .toLowerCase();
  if (/\bspeaking\b/.test(blob)) return "SPEAKING";
  if (/\bwriting\b/.test(blob)) return "WRITING";
  if (/\bmini[-\s]?test\b/.test(blob)) return "MINI_TEST";
  return "LISTENING_AND_READING";
}

export default function LearningPathsPage() {
  const { paths, loading, fetchPaths } = useLearningPath();
  const navigate = useNavigate();

  const [checkingSlug, setCheckingSlug] = useState(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelOptions, setLevelOptions] = useState([]);
  const [recommendedLevel, setRecommendedLevel] = useState(null);
  const [selectedSlug, setSelectedSlug] = useState(null);

  useEffect(() => {
    fetchPaths().catch(() => {
    });
  }, [fetchPaths]);

  const handlePathClick = async (e, p) => {
    e.preventDefault();
    const slug = p.slug ?? p.id;
    
    try {
      setCheckingSlug(slug);
      const testType = resolveLevelCheckTestType(p);
      const res = await getLevelLearningPath(slug, testType);
      const result = res.data;
      
      if (result.currentLevel != null) {
        navigate(`/learning-paths/${slug}`);
      } else {
        setSelectedSlug(slug);
        setRecommendedLevel(result.chooseLevel);
        
        let options = ["BEGINNER"];
        if (result.chooseLevel === "INTERMEDIATE") {
            options = ["BEGINNER", "INTERMEDIATE"];
        } else if (result.chooseLevel === "ADVANCED") {
            options = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
        }
        
        setLevelOptions(options);
        setShowLevelModal(true);
      }
    } catch (error) {
      console.error('Error checking level:', error);
      message.error(error?.message || "Không thể kiểm tra trạng thái lộ trình");
    } finally {
      setCheckingSlug(null);
    }
  };

  const handleSelectLevel = async (level) => {
    const slug = selectedSlug;
    if (!slug) {
      message.error("Không xác định được lộ trình. Vui lòng đóng và chọn lại.");
      return;
    }
    try {
      setCheckingSlug(slug);
      await createUserLearningPath(slug, level);
      try {
        await getLearningPathDetail(slug);
      } catch (detailErr) {
        console.warn("Learning path detail after create:", detailErr);
        message.warning(
          detailErr?.message ||
            "Level saved; could not load path details. Opening roadmap…",
        );
      }
      message.success("Tạo lộ trình thành công!");
      setShowLevelModal(false);
      navigate(`/learning-paths/${slug}`);
    } catch (error) {
      console.error("Error creating learning path:", error);
      message.error(error?.message || "Lỗi khi tạo lộ trình");
      setShowLevelModal(true);
    } finally {
      setCheckingSlug(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Learning Paths
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Chọn một lộ trình để xem chi tiết và tiến độ học trên bản đồ lộ
            trình.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Spin size="small" />
            <span>Đang tải learning paths…</span>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(paths || []).map((p) => {
            const slug = p.slug ?? p.id;
            const isChecking = checkingSlug === slug;
            return (
              <Link
                key={p.id}
                to={`/learning-paths/${slug}`}
                onClick={(e) => handlePathClick(e, p)}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                {isChecking && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                    <Spin />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">
                      {p.title || p.name || `Path #${p.id}`}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {p.description || "No description"}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 group-hover:bg-blue-100 transition-colors">
                    View
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!loading && (!paths || paths.length === 0) ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
            Chưa có learning path nào.
          </div>
        ) : null}
      </div>

      <Modal
        title="Select Your Learning Level"
        open={showLevelModal}
        onCancel={() => setShowLevelModal(false)}
        footer={null}
        destroyOnClose
      >
        <div className="mt-4 text-slate-600 mb-4">
          Choose a starting level for your learning path.
        </div>
        <div className="flex flex-col gap-3">
          {levelOptions.map((level) => {
            const isRecommended = level === recommendedLevel;
            let bgColor = "bg-slate-50 hover:bg-slate-100 border-slate-200";
            let textColor = "text-slate-700";
            
            if (level === "BEGINNER") {
              bgColor = "bg-green-50 hover:bg-green-100 border-green-200";
              textColor = "text-green-700";
            } else if (level === "INTERMEDIATE") {
              bgColor = "bg-orange-50 hover:bg-orange-100 border-orange-200";
              textColor = "text-orange-700";
            } else if (level === "ADVANCED") {
              bgColor = "bg-purple-50 hover:bg-purple-100 border-purple-200";
              textColor = "text-purple-700";
            }

            return (
              <Button
                key={level}
                onClick={() => handleSelectLevel(level)}
                size="large"
                className={`w-full text-left flex justify-between items-center h-auto py-3 border ${bgColor}`}
              >
                <span className={`font-medium ${textColor}`}>
                  {level === "BEGINNER"
                    ? "Beginner"
                    : level === "INTERMEDIATE"
                      ? "Intermediate"
                      : "Advanced"}
                </span>
                {isRecommended && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                    ⭐ Recommended
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
