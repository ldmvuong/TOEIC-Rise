import { useState } from "react";

// TOEIC Structure Data
const toeicStructure = {
  listening: {
    totalTime: 45,
    totalQuestions: 100,
    totalScore: 495,
    parts: [
      {
        partNumber: 1,
        name: "Hình ảnh",
        questions: 6,
        duration: "2-3 phút",
        description: "Nghe mô tả hình và chọn câu đúng",
        topics: [
          "Vật thể & vị trí",
          "Hành động/ngữ cảnh",
          "Trang phục & đồ vật",
          "Môi trường làm việc"
        ],
      },
      {
        partNumber: 2,
        name: "Hỏi – Đáp",
        questions: 25,
        duration: "7-8 phút",
        description: "Nghe câu hỏi và chọn câu trả lời phù hợp",
        topics: [
          "Câu hỏi Yes/No",
          "Câu hỏi Wh-",
          "Lời mời & đề nghị",
          "Yêu cầu/nhờ vả",
          "Sắp xếp lịch & địa điểm"
        ],
      },
      {
        partNumber: 3,
        name: "Hội thoại",
        questions: 39,
        duration: "20-22 phút",
        description: "Nghe hội thoại 2-3 người và trả lời câu hỏi",
        topics: [
          "Mục đích cuộc gọi/cuộc gặp",
          "Vấn đề & giải pháp",
          "Địa điểm & dịch vụ",
          "Suy luận người nói",
          "Biểu đồ/bảng thông tin"
        ],
      },
      {
        partNumber: 4,
        name: "Bài nói ngắn",
        questions: 30,
        duration: "13-15 phút",
        description: "Nghe độc thoại và trả lời câu hỏi",
        topics: [
          "Thông báo & hướng dẫn",
          "Quảng cáo/khuyến mại",
          "Báo cáo/dự báo",
          "Sự kiện & lịch trình"
        ],
      },
    ],
  },
  reading: {
    totalTime: 75,
    totalQuestions: 100,
    totalScore: 495,
    parts: [
      {
        partNumber: 5,
        name: "Hoàn thành câu",
        questions: 30,
        duration: "8-10 phút",
        description: "Chọn từ/cụm phù hợp để hoàn thành câu",
        topics: [
          "Từ loại (POS)",
          "Thì & hòa hợp chủ–vị",
          "Giới từ/liên từ",
          "Cấu trúc so sánh",
          "Từ vựng học thuật"
        ],
      },
      {
        partNumber: 6,
        name: "Điền vào đoạn văn",
        questions: 16,
        duration: "5-7 phút",
        description: "Chọn câu hoặc từ để hoàn thành đoạn văn",
        topics: [
          "Mạch lạc & liên kết",
          "Ngữ pháp",
          "Từ vựng theo ngữ cảnh",
          "Câu chèn thích hợp"
        ],
      },
      {
        partNumber: 7,
        name: "Đọc hiểu đoạn",
        questions: 54,
        duration: "55-60 phút",
        description: "Đọc đoạn đơn/kép và trả lời câu hỏi",
        topics: [
          "Email/Thư tín",
          "Thông báo & quảng cáo",
          "Bài báo/bản tin",
          "Mẫu đơn & biểu mẫu",
          "Đa đoạn (multi-passages)"
        ],
      },
    ],
  },
};

const faqData = [
  {
    question: "TOEIC có mấy phần?",
    answer:
      "TOEIC Listening & Reading có 2 phần chính: Listening (45 phút, 100 câu) và Reading (75 phút, 100 câu). Tổng cộng là 120 phút với 200 câu hỏi.",
  },
  {
    question: "Thời gian làm bài TOEIC là bao lâu?",
    answer:
      "Thời gian làm bài là 120 phút (2 giờ). Phần Listening kéo dài 45 phút (bao gồm cả hướng dẫn), và phần Reading kéo dài 75 phút.",
  },
  {
    question: "Có thi nói và viết không?",
    answer:
      "TOEIC Listening & Reading là bài thi trắc nghiệm chỉ gồm listening và reading. Tuy nhiên, TOEIC cũng có phiên bản Speaking & Writing riêng biệt nếu bạn muốn kiểm tra kỹ năng nói và viết.",
  },
  {
    question: "Điểm số TOEIC là bao nhiêu?",
    answer:
      "Điểm TOEIC Listening & Reading nằm từ 10 đến 990. Listening là 5-495, Reading là 5-495. Điểm số này được tính dựa trên số câu trả lời đúng.",
  },
  {
    question: "Mỗi câu trả lời sai có mất điểm không?",
    answer: "Không. TOEIC chỉ chấm điểm dựa trên số câu trả lời đúng. Trả lời sai và để trống đều không bị trừ điểm.",
  },
  {
    question: "Cần chuẩn bị bao lâu để đạt 800+ điểm?",
    answer:
      "Điều này tùy thuộc vào trình độ hiện tại của bạn. Nếu bạn luyện tập đều đặn 1-2 giờ mỗi ngày, thường mất 3-6 tháng để cải thiện đáng kể.",
  },
];

const ExamStructure = () => {
  const [activeTab, setActiveTab] = useState("listening");
  const [openFaq, setOpenFaq] = useState(null);

  const currentSection = activeTab === "listening" ? toeicStructure.listening : toeicStructure.reading;

  const sectionConfig = {
    listening: {
      color: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      badgeLight: "bg-blue-100",
      badgeText: "text-blue-600",
      shadowColor: "shadow-blue-600/30",
    },
    reading: {
      color: "from-purple-500 to-purple-600",
      bgLight: "bg-purple-50",
      badgeLight: "bg-purple-100",
      badgeText: "text-purple-600",
      shadowColor: "shadow-purple-600/30",
    },
  };

  const config = sectionConfig[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative px-4 py-16 md:py-20 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="container mx-auto max-w-5xl text-center space-y-8 relative z-10">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-balance leading-tight">
              Cấu trúc đề thi{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient">
                TOEIC
              </span>{" "}
              2025
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Khám phá định dạng, thời lượng, và bí quyết làm bài cho từng phần TOEIC Listening & Reading
            </p>
          </div>
        </div>
      </section>

      {/* Exam Structure Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl mb-4">
              <p className="text-slate-700 font-semibold text-lg">
                📊 Tổng cộng <span className="text-blue-600 font-bold">200 câu hỏi</span> | <span className="text-purple-600 font-bold">120 phút</span> làm bài
              </p>
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="flex gap-4 mb-10 justify-center flex-wrap">
            <button
              onClick={() => setActiveTab("listening")}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center gap-3 transform ${
                activeTab === "listening"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-600/40 scale-105"
                  : "bg-white text-slate-600 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-300 hover:scale-105"
              }`}
            >
              <span className="text-2xl">🎧</span>
              <span>Listening</span>
              <span className="text-sm font-normal opacity-90">(45 phút)</span>
            </button>
            <button
              onClick={() => setActiveTab("reading")}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center gap-3 transform ${
                activeTab === "reading"
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-xl shadow-purple-600/40 scale-105"
                  : "bg-white text-slate-600 hover:bg-purple-50 border-2 border-slate-200 hover:border-purple-300 hover:scale-105"
              }`}
            >
              <span className="text-2xl">📖</span>
              <span>Reading</span>
              <span className="text-sm font-normal opacity-90">(75 phút)</span>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="p-6 text-center border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 bg-white group">
              <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                {currentSection.totalQuestions}
              </div>
              <div className="text-sm md:text-base font-semibold text-slate-700">Câu hỏi</div>
            </div>
            <div className="p-6 text-center border-2 border-slate-200 rounded-2xl hover:border-purple-400 hover:shadow-xl transition-all duration-300 bg-white group">
              <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                {currentSection.totalTime}
              </div>
              <div className="text-sm md:text-base font-semibold text-slate-700">Phút</div>
            </div>
            <div className="p-6 text-center border-2 border-slate-200 rounded-2xl hover:border-emerald-400 hover:shadow-xl transition-all duration-300 bg-white group">
              <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                {currentSection.totalScore}
              </div>
              <div className="text-sm md:text-base font-semibold text-slate-700">Điểm</div>
            </div>
          </div>

          {/* Parts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {currentSection.parts.map((part, index) => (
              <div
                key={part.partNumber}
                className="group p-6 border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-2xl transition-all duration-300 bg-white relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Decorative gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                {/* Part Number & Title */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-start gap-4">
                    <div
                      className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${config.badgeLight} font-extrabold ${config.badgeText} text-lg shadow-md group-hover:scale-110 transition-transform duration-300`}
                    >
                      Part {part.partNumber}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-1">{part.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{part.duration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-slate-900">{part.questions}</div>
                    <div className="text-xs text-slate-500 font-medium">câu hỏi</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-base text-slate-600 mb-4 leading-relaxed relative z-10">{part.description}</p>

                {/* Topics */}
                <div className="flex flex-wrap gap-2 relative z-10">
                  {part.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${config.badgeLight} ${config.badgeText} border border-transparent hover:border-current transition-colors`}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-white via-blue-50/30 to-white">
        <div className="container mx-auto max-w-5xl space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">Câu hỏi thường gặp</h2>
            <p className="text-lg text-slate-600">Những thắc mắc phổ biến về bài thi TOEIC</p>
          </div>

          <div className="w-full space-y-4">
            {faqData.map((item, index) => (
              <div
                key={index}
                className={`border-2 rounded-2xl transition-all duration-300 overflow-hidden ${
                  openFaq === index
                    ? "border-blue-400 bg-gradient-to-br from-blue-50 to-white shadow-xl"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 font-bold text-left flex items-center justify-between group"
                >
                  <span className="text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.question}
                  </span>
                  <span
                    className={`text-2xl font-light transition-transform duration-300 ${
                      openFaq === index
                        ? "text-blue-600 rotate-180"
                        : "text-slate-400 group-hover:text-blue-500"
                    }`}
                  >
                    +
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-slate-700 leading-relaxed text-base animate-fadeIn">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExamStructure;
