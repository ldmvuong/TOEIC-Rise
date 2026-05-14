import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Tour } from "antd";

const STORAGE_KEY_PREFIX = "toeicrise_tour_v2_";

const tourConfig = {
  "/": [
    {
      title: "Chào mừng bạn đến với TOEIC RISE 🚀",
      description:
        "Nền tảng luyện thi TOEIC toàn diện giúp bạn tối ưu thời gian học và dễ dàng đạt mục tiêu điểm số. Hãy bấm 'Next' để dạo quanh và làm quen với các tính năng hữu ích nhất nhé!",
      target: null,
    },
    {
      title: "Thanh Điều Hướng Chính",
      description:
        "Thanh công cụ này giúp bạn truy cập nhanh mọi chức năng. Bạn có thể chuyển đổi giữa việc học theo Lộ trình (Learning Paths), luyện Đề thi (Online Tests), học Từ vựng (Flashcards), hay theo dõi Thống kê (Statistics) học tập của mình.",
      target: () =>
        document.querySelector("header nav") ||
        document.querySelector("header") ||
        document.querySelector("nav"),
    },
    {
      title: "Tra Cứu Nhanh & Lối Tắt",
      description:
        "Ở một số trang, bạn có thể tìm thấy thanh tìm kiếm để tra cứu nhanh đề thi, bài viết hoặc từ vựng. Mọi thứ được thiết kế để bạn tiết kiệm thời gian nhất có thể.",
      target: () =>
        document.querySelector(".ant-input-search") ||
        document.querySelector(".search-bar"),
    },
    {
      title: "Quản Lý Tài Khoản & Tiến Độ",
      description:
        "Khu vực này chứa hồ sơ cá nhân và các tuỳ chọn tài khoản. Bấm vào đây để xem trang cá nhân, chỉnh sửa thông tin, theo dõi tổng quan tiến độ hoặc đăng xuất. Luôn đăng nhập để không bị mất dữ liệu học tập nhé!",
      target: () =>
        document.querySelector(".ant-dropdown-trigger img") ||
        document.querySelector("#user-menu-btn") ||
        document.querySelector("header .flex.items-center.gap-4") ||
        document.querySelector("#login-btn"),
    },
  ],
  "/online-tests": [
    {
      title: "Thi Thử TOEIC Online 📝",
      description:
        "Chào mừng đến với thư viện đề thi! Tại đây cung cấp hàng trăm bộ đề sát với định dạng TOEIC thực tế (ETS, Hacker, v.v.). Đây là nơi lý tưởng để bạn đánh giá trình độ và làm quen với áp lực phòng thi.",
      target: null,
    },
    {
      title: "Tìm Kiếm & Bộ Lọc Đề Thi",
      description:
        "Đừng bối rối trước số lượng lớn đề thi! Hãy sử dụng thanh tìm kiếm hoặc các bộ lọc theo loại đề, năm xuất bản để tìm chính xác bộ đề bạn cần. Nhấn vào một đề bài bạn quan tâm để xem chi tiết.",
      target: () =>
        document.querySelector(".ant-input-search") ||
        document.querySelector(".ant-select") ||
        document.querySelector(".test-filters"),
    },
    {
      title: "Bắt Đầu Làm Bài",
      description:
        "Khi đã sẵn sàng, hãy bấm nút 'Chi tiết' hoặc 'Làm bài' trên một thẻ đề. Giao diện làm bài sẽ cung cấp đồng hồ đếm ngược và phiếu trả lời (Answer Sheet) giống như thi thật. Lời khuyên: Hãy sắp xếp thời gian làm trọn vẹn 1 đề mỗi tuần!",
      target: () =>
        document.querySelector(".ant-card") ||
        document.querySelector(".test-card") ||
        document.querySelector(".start-test-btn"),
    },
  ],
  "/learning-paths": [
    {
      title: "Lộ Trình Học Tập Cá Nhân Hóa 🛤️",
      description:
        "Bạn chưa biết bắt đầu học từ đâu? Tính năng Lộ trình học (Learning Paths) chính là giải pháp. Các bài học ở đây được sắp xếp bài bản từ cơ bản đến nâng cao, đi kèm từ vựng, ngữ pháp và kỹ năng làm bài.",
      target: null,
    },
    {
      title: "Khám Phá Các Lộ Trình",
      description:
        "Các lộ trình được chia theo mục tiêu điểm số (ví dụ: TOEIC 500+, 700+). Chọn một lộ trình phù hợp với trình độ hiện tại, bấm 'Tham gia' hoặc 'Xem chi tiết' để bắt đầu. Hãy hoàn thành từng bài học để mở khóa bài tiếp theo!",
      target: () =>
        document.querySelector(".ant-card") ||
        document.querySelector(".path-item") ||
        document.querySelector(".learning-path-list"),
    },
  ],
  "/flashcards": [
    {
      title: "Thư Viện Từ Vựng Flashcard 🗂️",
      description:
        "Học từ vựng không còn nhàm chán với Flashcard! Hệ thống áp dụng phương pháp Lặp Lại Ngắt Quãng (Spaced Repetition) - tự động nhắc bạn ôn lại từ vựng đúng thời điểm chuẩn bị quên, giúp nhớ lâu hơn.",
      target: null,
    },
    {
      title: "Chế Độ Luyện Tập Đa Dạng",
      description:
        "Với mỗi bộ Flashcard, bạn có thể Lật thẻ, làm bài Trắc nghiệm (Quiz), hoặc chơi Ghép thẻ (Match). Chọn bộ từ bạn muốn ôn, bấm 'Luyện tập' và khám phá các chế độ. Mẹo nhỏ: Ôn 15 phút mỗi ngày hiệu quả hơn học dồn một lần!",
      target: () =>
        document.querySelector(".ant-card") ||
        document.querySelector(".flashcard-item") ||
        document.querySelector(".practice-actions"),
    },
  ],
  "/statistics": [
    {
      title: "Phân Tích & Thống Kê 📊",
      description:
        "Bảng điều khiển cá nhân cung cấp bức tranh toàn cảnh về nỗ lực của bạn. Hệ thống sẽ phân tích điểm số các bài thi, số câu đúng/sai ở từng kỹ năng (Listening/Reading) giúp bạn nhận ra điểm mạnh và phần cần cải thiện.",
      target: null,
    },
  ],
  "/exam-structure": [
    {
      title: "Nắm Vững Cấu Trúc Đề Thi 🔍",
      description:
        "Biết người biết ta, trăm trận trăm thắng! Mục này giải phẫu chi tiết 7 phần (Parts) của một bài thi TOEIC tiêu chuẩn. Hãy đọc kỹ các mẹo làm bài và nhận diện các dạng câu hỏi thường gặp để tránh sập bẫy nhé.",
      target: null,
    },
  ],
  "/dictation": [
    {
      title: "Luyện Nghe Chép Chính Tả 🎧",
      description:
        "Dictation là 'vũ khí bí mật' giúp bạn tăng vọt điểm Listening. Bằng cách nghe và gõ lại chính xác từng từ, bạn sẽ quen với cách phát âm, nối âm và ngữ điệu của người bản xứ.",
      target: null,
    },
    {
      title: "Thao Tác Thực Hành",
      description:
        "Hãy sử dụng các nút Play/Pause để nghe đoạn băng. Nhập đoạn văn bản bạn nghe được vào ô trống. Nếu khó quá, bạn có thể chỉnh tốc độ chậm lại. Bấm 'Kiểm tra' để xem đáp án đúng sai và học từ mới ngay lập tức.",
      target: () =>
        document.querySelector(".ant-input") ||
        document.querySelector(".audio-controls") ||
        document.querySelector(".dictation-input-area"),
    },
  ],
  "/profile": [
    {
      title: "Hồ Sơ Của Bạn 👤",
      description:
        "Trang cá nhân cho phép bạn cập nhật ảnh đại diện, thay đổi mật khẩu và quản lý thông tin tài khoản. Đừng quên kiểm tra lịch sử hoạt động để thấy bản thân đã nỗ lực như thế nào nhé!",
      target: null,
    },
  ],
  "/blog": [
    {
      title: "Góc Chia Sẻ & Tài Liệu 📰",
      description:
        "Chào mừng bạn đến với Blog! Đây là nơi tổng hợp các bài viết chia sẻ kinh nghiệm học tập, chiến thuật làm bài và tài liệu TOEIC hữu ích giúp bạn ôn thi hiệu quả hơn.",
      target: null,
    },
    {
      title: "Lọc Theo Danh Mục 📑",
      description:
        "Sử dụng danh sách danh mục để dễ dàng tìm kiếm các bài viết theo chủ đề bạn quan tâm (ví dụ: Ngữ pháp, Từ vựng, Mẹo thi TOEIC). Nhấn vào một danh mục để xem tất cả bài viết liên quan.",
      target: () =>
        document.querySelector(".lg\\:col-span-4 .ant-card") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Duyệt danh mục"),
        ),
    },
    {
      title: "Tìm Kiếm Bài Viết 🔍",
      description:
        "Bạn đang tìm một chủ đề cụ thể? Nhập từ khóa vào thanh tìm kiếm này để hệ thống lọc ra các bài viết phù hợp nhất một cách nhanh chóng.",
      target: () =>
        document.querySelector("input[placeholder*='Tìm bài viết']") ||
        document.querySelector(".ant-input-wrapper") ||
        document.querySelector(".lg\\:w-\\[420px\\]"),
    },
    {
      title: "Mục Lục Tương Tác 📖",
      description:
        "Khi xem chi tiết một bài viết dài, hãy sử dụng 'Mục lục' bên cạnh (nếu có) để nhảy vọt đến phần nội dung bạn quan tâm mà không cần cuộn trang mỏi tay.",
      target: () =>
        document.querySelector("nav[aria-label='Table of contents']") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Mục lục"),
        ),
    },
    {
      title: "Bài Viết Liên Quan 🔗",
      description:
        "Sau khi đọc xong, đừng vội rời đi! Bạn có thể tham khảo thêm các 'Bài viết liên quan' ở cuối bài để mở rộng kiến thức và khám phá những nội dung hấp dẫn khác.",
      target: () =>
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Bài viết liên quan"),
        ),
    },
  ],
  "/blogs": [
    {
      title: "Góc Chia Sẻ & Tài Liệu 📰",
      description:
        "Chào mừng bạn đến với Blog! Đây là nơi tổng hợp các bài viết chia sẻ kinh nghiệm học tập, chiến thuật làm bài và tài liệu TOEIC hữu ích giúp bạn ôn thi hiệu quả hơn.",
      target: null,
    },
    {
      title: "Lọc Theo Danh Mục 📑",
      description:
        "Sử dụng danh sách danh mục để dễ dàng tìm kiếm các bài viết theo chủ đề bạn quan tâm (ví dụ: Ngữ pháp, Từ vựng, Mẹo thi TOEIC). Nhấn vào một danh mục để xem tất cả bài viết liên quan.",
      target: () =>
        document.querySelector(".lg\\:col-span-4 .ant-card") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Duyệt danh mục"),
        ),
    },
    {
      title: "Tìm Kiếm Bài Viết 🔍",
      description:
        "Bạn đang tìm một chủ đề cụ thể? Nhập từ khóa vào thanh tìm kiếm này để hệ thống lọc ra các bài viết phù hợp nhất một cách nhanh chóng.",
      target: () =>
        document.querySelector("input[placeholder*='Tìm bài viết']") ||
        document.querySelector(".ant-input-wrapper") ||
        document.querySelector(".lg\\:w-\\[420px\\]"),
    },
    {
      title: "Mục Lục Tương Tác 📖",
      description:
        "Khi xem chi tiết một bài viết dài, hãy sử dụng 'Mục lục' bên cạnh (nếu có) để nhảy vọt đến phần nội dung bạn quan tâm mà không cần cuộn trang mỏi tay.",
      target: () =>
        document.querySelector("nav[aria-label='Table of contents']") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Mục lục"),
        ),
    },
    {
      title: "Bài Viết Liên Quan 🔗",
      description:
        "Sau khi đọc xong, đừng vội rời đi! Bạn có thể tham khảo thêm các 'Bài viết liên quan' ở cuối bài để mở rộng kiến thức và khám phá những nội dung hấp dẫn khác.",
      target: () =>
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Bài viết liên quan"),
        ),
    },
  ],
};

export default function WelcomeGuideModal() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let basePath = pathname;
    if (pathname !== "/" && pathname.split("/").length > 1) {
      basePath = "/" + pathname.split("/")[1];
    }

    const currentSteps = tourConfig[basePath];

    if (currentSteps && currentSteps.length > 0) {
      setSteps(currentSteps);
      try {
        const seen =
          localStorage.getItem(STORAGE_KEY_PREFIX + basePath) === "1";
        if (!seen) {
          setCurrentStep(0);
          const t = window.setTimeout(() => setOpen(true), 500);
          return () => window.clearTimeout(t);
        }
      } catch {
        /* ignore */
      }
    } else {
      setSteps([]);
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleOpenTour = () => {
      if (steps.length > 0) {
        setCurrentStep(0);
        setOpen(true);
      }
    };
    window.addEventListener("open-tour", handleOpenTour);
    return () => window.removeEventListener("open-tour", handleOpenTour);
  }, [steps]);

  const handleClose = () => {
    setOpen(false);
    let basePath = pathname;
    if (pathname !== "/" && pathname.split("/").length > 1) {
      basePath = "/" + pathname.split("/")[1];
    }
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + basePath, "1");
    } catch {
      /* ignore */
    }
  };

  if (steps.length === 0) return null;

  return (
    <Tour
      open={open}
      onClose={handleClose}
      steps={steps}
      current={currentStep}
      onChange={setCurrentStep}
    />
  );
}
