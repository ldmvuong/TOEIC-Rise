import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { getHistoryTest } from '../../api/api';

const DAY_OPTIONS = [
    { label: '1 tháng gần nhất', value: 'ONE_MONTH' },
    { label: '3 tháng gần nhất', value: 'THREE_MONTHS' },
    { label: '6 tháng gần nhất', value: 'SIX_MONTHS' },
    { label: '1 năm gần nhất', value: 'ONE_YEAR' },
    { label: '2 năm gần nhất', value: 'TWO_YEARS' },
    { label: '3 năm gần nhất', value: 'THREE_YEARS' },
];

const MOCK_OVERVIEW = {
    totalTests: 1,
    totalTime: 0,
    goal: null,
};

const MOCK_TAB_STATS = {
    listening: {
        totalTests: 1,
        accuracy: 50,
        avgTime: 0,
        avgScore: 0,
        bestScore: 0,
        trend: [
            { date: '2025-10-29', accuracy: 0 },
            { date: '2025-11-15', accuracy: 53.85 },
        ],
    },
    reading: {
        totalTests: 0,
        accuracy: 0,
        avgTime: 0,
        avgScore: 0,
        bestScore: 0,
        trend: [],
    },
};

const formatDuration = (seconds = 0) => {
    const totalSeconds = Number(seconds) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const Card = ({ title, value, subtitle, highlight }) => (
    <div className="flex-1 min-w-[180px] rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-gray-500 mb-2">{title}</div>
        <div className="text-3xl font-semibold text-gray-900">{value}</div>
        {subtitle && (
            <div className={`mt-1 text-sm ${highlight ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {subtitle}
            </div>
        )}
    </div>
);

const TrendChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                Chưa có dữ liệu thống kê
            </div>
        );
    }

    return (
        <div className="h-64 rounded-2xl border border-gray-100 bg-white p-6 flex flex-col justify-between">
            <div className="text-sm font-medium text-pink-500 mb-4">%Correct (30D)</div>
            <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-300">
                    {[100, 80, 60, 40, 20, 0].map(value => (
                        <div key={value} className="flex items-center gap-2">
                            <div className="w-10 text-right">{value}</div>
                            <div className="flex-1 border-t border-dashed border-gray-200" />
                        </div>
                    ))}
                </div>
                <svg className="relative w-full h-full">
                    {data.map((point, index) => {
                        if (index === 0) return null;
                        const prev = data[index - 1];
                        return (
                            <line
                                key={`${point.date}-line`}
                                x1={`${(index - 1) / (data.length - 1) * 100}%`}
                                y1={`${100 - prev.accuracy}%`}
                                x2={`${index / (data.length - 1) * 100}%`}
                                y2={`${100 - point.accuracy}%`}
                                stroke="#f472b6"
                                strokeWidth="3"
                            />
                        );
                    })}
                    {data.map((point, index) => (
                        <g key={point.date}>
                            <circle
                                cx={`${index / (data.length - 1) * 100}%`}
                                cy={`${100 - point.accuracy}%`}
                                r="6"
                                fill="#f472b6"
                                stroke="#fff"
                                strokeWidth="2"
                            />
                            <text
                                x={`${index / (data.length - 1) * 100}%`}
                                y={`${100 - point.accuracy}%`}
                                dy="-10"
                                fontSize="11"
                                fill="#f472b6"
                                textAnchor="middle"
                            >
                                {point.accuracy.toFixed(2)}%
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-4">
                {data.map(point => (
                    <span key={point.date}>{point.date}</span>
                ))}
            </div>
        </div>
    );
};

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_RANGE = DAY_OPTIONS[0].value;

const TestAnalytics = () => {
    const navigate = useNavigate();
    const [selectedRange, setSelectedRange] = useState(DEFAULT_RANGE);
    const [activeRange, setActiveRange] = useState(DEFAULT_RANGE);
    const [activeTab, setActiveTab] = useState('listening');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyData, setHistoryData] = useState([]);
    const [historyMeta, setHistoryMeta] = useState({
        page: 0,
        pageSize: DEFAULT_PAGE_SIZE,
        pages: 1,
        total: 0
    });
    const [historyLoading, setHistoryLoading] = useState(false);

    const effectivePageSize = historyMeta.pageSize || DEFAULT_PAGE_SIZE;
    const totalRows = historyMeta.total;
    const totalPages = Math.max(1, historyMeta.pages || 1);
    const startRow = totalRows === 0 ? 0 : historyMeta.page * effectivePageSize + 1;
    const endRow = totalRows === 0 ? 0 : Math.min((historyMeta.page + 1) * effectivePageSize, totalRows);

    const currentStats = activeTab === 'listening' ? MOCK_TAB_STATS.listening : MOCK_TAB_STATS.reading;

    useEffect(() => {
        setHistoryPage(1);
    }, [activeRange]);

    useEffect(() => {
        const fetchHistory = async () => {
            setHistoryLoading(true);
            try {
                const query = new URLSearchParams({
                    days: activeRange,
                    page: historyPage - 1,
                    size: DEFAULT_PAGE_SIZE
                }).toString();

                const response = await getHistoryTest(query);
                const data = response?.data;

                setHistoryData(data?.result || []);
                setHistoryMeta({
                    page: data?.meta?.page ?? historyPage - 1,
                    pageSize: data?.meta?.pageSize ?? DEFAULT_PAGE_SIZE,
                    pages: data?.meta?.pages ?? 1,
                    total: data?.meta?.total ?? 0
                });

                const metaPages = Math.max(1, data?.meta?.pages ?? 1);
                if (historyPage > metaPages) {
                    setHistoryPage(metaPages);
                }
            } catch (error) {
                console.error('Error fetching test history:', error);
                message.error('Không thể tải danh sách đề thi đã làm');
                setHistoryData([]);
                setHistoryMeta({
                    page: 0,
                    pageSize: DEFAULT_PAGE_SIZE,
                    pages: 1,
                    total: 0
                });
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [activeRange, historyPage]);

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="max-w-6xl mx-auto px-4 space-y-8">
                <div className="rounded-3xl bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 p-8 shadow-sm">
                    <div className="flex items-center gap-3 text-indigo-700 mb-2">
                        <span className="text-3xl">📈</span>
                        <div>
                            <p className="text-sm tracking-wide uppercase font-semibold text-indigo-500">TOEIC</p>
                            <h1 className="text-3xl font-bold text-gray-900">Thống kê kết quả luyện thi</h1>
                        </div>
                    </div>
                    <p className="text-sm text-red-500 mt-4">
                        Chú ý: Mặc định trang thống kê sẽ hiển thị các bài làm trong khoảng thời gian 30 ngày gần nhất,
                        để xem kết quả trong khoảng thời gian xa hơn bạn chọn ở phần dropdown dưới đây.
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium text-gray-700">
                                Lọc kết quả theo ngày (tính từ bài thi cuối):
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={selectedRange}
                                    onChange={(e) => setSelectedRange(e.target.value)}
                                    className="w-full sm:w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                >
                                    {DAY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setActiveRange(selectedRange);
                                            setHistoryPage(1);
                                        }}
                                        className="flex-1 sm:flex-none px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                                    >
                                        Search
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedRange(DEFAULT_RANGE);
                                            setActiveRange(DEFAULT_RANGE);
                                            setHistoryPage(1);
                                        }}
                                        className="flex-1 sm:flex-none px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <Card title="Số đề đã làm" value={MOCK_OVERVIEW.totalTests} subtitle="đề thi" />
                        <Card title="Thời gian luyện thi" value={MOCK_OVERVIEW.totalTime} subtitle="phút" />
                        <Card
                            title="Điểm mục tiêu"
                            value={MOCK_OVERVIEW.goal ? `${MOCK_OVERVIEW.goal}/990` : 'Chưa thiết lập'}
                            subtitle={MOCK_OVERVIEW.goal ? 'Đang theo dõi' : 'Tạo ngay'}
                            highlight={!MOCK_OVERVIEW.goal}
                        />
                    </div>
                </div>

                    <div className="flex gap-3">
                        <button
                            className={`px-4 py-2 rounded-full text-sm font-medium ${
                                activeTab === 'listening'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => setActiveTab('listening')}
                        >
                            Listening
                        </button>
                        <button
                            className={`px-4 py-2 rounded-full text-sm font-medium ${
                                activeTab === 'reading'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => setActiveTab('reading')}
                        >
                            Reading
                        </button>
                    </div>

                <div className="grid gap-4 md:grid-cols-5">
                    <Card title="Số đề đã làm" value={currentStats.totalTests} subtitle="đề thi" />
                    <Card title="Độ chính xác (#đúng/#tổng)" value={`${currentStats.accuracy.toFixed(2)}%`} />
                    <Card title="Thời gian trung bình" value={currentStats.avgTime} subtitle="phút" />
                    <Card title="Điểm trung bình" value={`${currentStats.avgScore}/495`} />
                    <Card title="Điểm cao nhất" value={`${currentStats.bestScore}/495`} />
                </div>

                <TrendChart data={currentStats.trend} />

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Danh sách đề thi đã làm</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr className="text-sm text-gray-500">
                                    <th className="px-4 py-3 text-left font-medium">Ngày làm</th>
                                    <th className="px-4 py-3 text-left font-medium">Đề thi</th>
                                    <th className="px-4 py-3 text-center font-medium">Kết quả</th>
                                    <th className="px-4 py-3 text-center font-medium">Thời gian làm bài</th>
                                    <th className="px-4 py-3 text-center font-medium">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                {historyLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-gray-500">
                                            <Spin />
                                        </td>
                                    </tr>
                                ) : historyData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-gray-500">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                ) : (
                                    historyData.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-700">{item.createdAt}</td>
                                        <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {(item.parts && item.parts.length > 0 ? item.parts : ['Full test']).map((part, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                                                part === 'Full test'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-orange-100 text-orange-700'
                                                            }`}
                                                        >
                                                            {part}
                                                        </span>
                                                    ))}
                                                </div>
                                        </td>
                                            <td className="px-4 py-3 text-center font-semibold text-gray-900">
                                                {item.correctAnswers}/{item.totalQuestions}
                                                {typeof item.totalScore === 'number' && (
                                                    <span className="block text-xs font-normal text-gray-500 mt-1">
                                                        (Điểm: {item.totalScore})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600">
                                                {formatDuration(item.timeSpent)}
                                            </td>
                                        <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => navigate(`/test-result/${item.id}`)}
                                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between text-sm">
                        <span className="text-gray-600">
                            {startRow}-{endRow} trên {totalRows} hàng
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                                disabled={historyPage === 1}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                                    historyPage === 1
                                        ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Trước
                            </button>
                            <button
                                onClick={() => setHistoryPage(page => Math.min(totalPages, page + 1))}
                                disabled={historyPage === totalPages}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                                    historyPage === totalPages
                                        ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Sau
                            </button>
                            <div className="min-w-[32px] text-center font-medium text-gray-700 py-1 px-3 border border-blue-200 rounded-lg bg-blue-50">
                                {historyPage}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestAnalytics;
