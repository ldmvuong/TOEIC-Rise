import { useState, useEffect, createElement } from "react";
import { useLocation } from "react-router-dom";
import { Modal, Checkbox } from "antd";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MapIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAppSelector } from "../../redux/hooks";
import {
  resolveFeatureIntroId,
  getFeatureIntroStorageKey,
} from "../../utils/featureIntro";

const intros = {
  online_tests: {
    title: "Đề thi online",
    subtitle: "Luyện đề TOEIC với đồng hồ và giao diện gần giống thi thật.",
    icon: DocumentTextIcon,
    bullets: [
      "Chọn đề trong danh sách, đọc hướng dẫn rồi bắt đầu khi đã sẵn sàng.",
      "Trong bài làm có thể đánh dấu câu (flag), chuyển part / câu theo lưới điều hướng.",
      "Nộp bài để xem điểm, phân tích chi tiết và ôn lại phần làm sai nếu có.",
    ],
  },
  learning_paths: {
    title: "Learning Path",
    subtitle: "Học theo lộ trình bài giảng và nội dung đã sắp xếp sẵn.",
    icon: MapIcon,
    bullets: [
      "Mỗi lộ trình gồm nhiều bài; hoàn thành từng bài để mở bước tiếp theo (nếu có).",
      "Trong bài có thể có video, nội dung đọc và phần luyện tập theo chủ đề.",
      "Một số lộ trình có giới hạn số bài/ngày — nội dung sẽ gợi ý khi bạn chạm giới hạn.",
    ],
  },
  flashcards: {
    title: "Flashcard",
    subtitle: "Ôn từ vựng với thẻ và chế độ lặp lại ngắt quãng (SRS).",
    icon: BookOpenIcon,
    bullets: [
      "Tạo bộ thẻ riêng hoặc dùng thư viện; mỗi thẻ có mặt trước / sau (từ, nghĩa, ví dụ…).",
      "Luyện theo quiz, gõ từ, ghép đôi hoặc đến hạn ôn trong mục “Ôn đến hạn”.",
      "Tiến độ được lưu theo tài khoản — nhớ đăng nhập để đồng bộ.",
    ],
  },
  statistics: {
    title: "Thống kê kết quả",
    subtitle: "Theo dõi quá trình làm đề và xu hướng điểm.",
    icon: ChartBarIcon,
    bullets: [
      "Xem tổng quan các bài đã làm, phân bố theo thời gian hoặc theo đề.",
      "Dùng biểu đồ và số liệu để biết điểm mạnh / phần cần ôn thêm.",
      "Kết quả chi tiết từng bài vẫn mở từ trang kết quả sau khi nộp bài.",
    ],
  },
  exam_structure: {
    title: "Cấu trúc đề thi",
    subtitle: "Nắm format TOEIC Listening & Reading trước khi vào làm đề.",
    icon: AcademicCapIcon,
    bullets: [
      "Tổng quan các part, số câu và thời gian gợi ý cho từng phần.",
      "Đọc trước giúp giảm bỡ ngỡ khi lần đầu làm đề có giới hạn phút.",
      "Kết hợp với “Đề thi online” để luyện sau khi đã hiểu cấu trúc.",
    ],
  },
  profile: {
    title: "Hồ sơ cá nhân",
    subtitle: "Thông tin tài khoản và cài đặt liên quan đến trải nghiệm học.",
    icon: UserCircleIcon,
    bullets: [
      "Cập nhật họ tên, email hoặc mật khẩu theo chính sách trang.",
      "Đăng xuất an toàn khi dùng chung máy.",
      "Một số tùy chọn chỉ hiển thị với từng loại tài khoản.",
    ],
  },
};

export default function FeatureIntroModal() {
  const { pathname } = useLocation();
  const user = useAppSelector((s) => s.account.user);
  const isAuthenticated = useAppSelector((s) => s.account.isAuthenticated);
  const isLearner = user?.role === "LEARNER";

  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    setOpen(false);
    const featureId = resolveFeatureIntroId(pathname, {
      isAuthenticated,
      isLearner,
    });

    if (!featureId || !intros[featureId]) {
      setActiveId(null);
      return;
    }

    let seen = false;
    try {
      seen = localStorage.getItem(getFeatureIntroStorageKey(featureId)) === "1";
    } catch {
      /* ignore */
    }
    if (seen) {
      setActiveId(null);
      return;
    }

    setActiveId(featureId);
    const t = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(t);
  }, [pathname, isAuthenticated, isLearner]);

  const content = activeId ? intros[activeId] : null;

  const persistDismiss = () => {
    if (!dontShowAgain || !activeId) return;
    try {
      localStorage.setItem(getFeatureIntroStorageKey(activeId), "1");
    } catch {
      /* ignore */
    }
  };

  const handleOk = () => {
    persistDismiss();
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  if (!content) return null;

  return (
    <Modal
      title={
        <div className="flex items-start gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            {createElement(content.icon, {
              className: "h-6 w-6",
              "aria-hidden": true,
            })}
          </span>
          <div className="min-w-0">
            <span className="block text-lg font-semibold text-blue-900">
              {content.title}
            </span>
            <p className="mt-0.5 text-sm font-normal text-gray-600">
              {content.subtitle}
            </p>
          </div>
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Đã hiểu"
      cancelText="Để sau"
      width={520}
      centered
      destroyOnHidden
      classNames={{ body: "pt-1" }}
    >
      <ul className="mt-2 list-none space-y-2.5 p-0">
        {content.bullets.map((line) => (
          <li
            key={line}
            className="relative pl-4 text-sm leading-relaxed text-gray-700 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-green-600 before:content-['']"
          >
            {line}
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-gray-100 pt-3">
        <Checkbox
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
        >
          Không hiển thị lại giới thiệu cho mục này
        </Checkbox>
      </div>
    </Modal>
  );
}
