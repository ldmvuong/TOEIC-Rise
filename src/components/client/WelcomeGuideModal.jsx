import { useState, useEffect, createElement } from "react";
import { useLocation } from "react-router-dom";
import { Modal, Checkbox } from "antd";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  DocumentTextIcon,
  HomeIcon,
  MapIcon,
} from "@heroicons/react/24/outline";

const STORAGE_KEY = "toeicrise_welcome_guide_v1";

const tips = [
  {
    icon: HomeIcon,
    title: "Trang chủ",
    desc: "Tổng quan và điểm vào các khu học tập.",
  },
  {
    icon: DocumentTextIcon,
    title: "Đề thi online",
    desc: "Chọn đề, làm bài theo giờ và xem đáp án sau khi nộp.",
  },
  {
    icon: MapIcon,
    title: "Learning Path",
    desc: "Lộ trình bài học theo chủ đề (cần đăng nhập học viên).",
  },
  {
    icon: BookOpenIcon,
    title: "Flashcard",
    desc: "Ôn từ vựng với thẻ ghi nhớ và luyện tập SRS.",
  },
  {
    icon: ChartBarIcon,
    title: "Thống kê kết quả",
    desc: "Theo dõi tiến độ và các bài đã làm.",
  },
  {
    icon: AcademicCapIcon,
    title: "Cấu trúc đề thi",
    desc: "Nắm format TOEIC trước khi vào làm đề.",
  },
];

export default function WelcomeGuideModal() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    if (pathname !== "/") {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const persistDismiss = () => {
    if (!dontShowAgain) return;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
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

  return (
    <Modal
      title={
        <div className="pr-8">
          <span className="text-lg font-semibold text-blue-900">
            Chào mừng đến TOEIC RISE
          </span>
          <p className="mt-1 text-sm font-normal text-gray-600">
            Gợi ý nhanh để bạn làm quen trang web
          </p>
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Đã hiểu"
      cancelText="Để sau"
      width={560}
      centered
      destroyOnHidden
      classNames={{ body: "pt-1" }}
    >
      <ul className="mt-2 space-y-3 max-h-[min(420px,60vh)] overflow-y-auto pr-1">
        {tips.map(({ icon, title, desc }) => (
          <li
            key={title}
            className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              {createElement(icon, {
                className: "h-5 w-5",
                "aria-hidden": true,
              })}
            </span>
            <div className="min-w-0">
              <div className="font-medium text-gray-900">{title}</div>
              <div className="text-sm text-gray-600">{desc}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-gray-500">
        Một số mục cần{" "}
        <span className="font-medium text-gray-700">đăng nhập</span> với tài
        khoản học viên.
      </p>
      <div className="mt-4 border-t border-gray-100 pt-3">
        <Checkbox
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
        >
          Không hiển thị lại hộp thoại này
        </Checkbox>
      </div>
    </Modal>
  );
}
