import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { getHistoryTest, getTestAnalytics, getScoreStatistics } from '../../api/api';
import { secondsToMinutes } from '../../utils/timeUtils';
import {
    LineChart,
    BarChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const DAY_OPTIONS = [
    { label: '1 tháng gần nhất', value: 'ONE_MONTH' },
    { label: '3 tháng gần nhất', value: 'THREE_MONTHS' },
    { label: '6 tháng gần nhất', value: 'SIX_MONTHS' },
    { label: '1 năm gần nhất', value: 'ONE_YEAR' },
    { label: '2 năm gần nhất', value: 'TWO_YEARS' },
    { label: '3 năm gần nhất', value: 'THREE_YEARS' },
];

const DEFAULT_DAYS = DAY_OPTIONS[0].value;

const formatDuration = (seconds = 0) => {
    const totalSeconds = Number(seconds) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const Card = ({ title, value, subtitle, highlight }) => (
    <div className="flex-1 min-w-[160px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-gray-500 mb-1.5">{title}</div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        {subtitle && (
            <div className={`mt-1 text-xs ${highlight ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {subtitle}
            </div>
        )}
    </div>
);

const ScoreChart = ({ data, chartType }) => {
    // Support multiple data structures
    const chartData = data?.chartData || data?.trendData || data?.scores || [];
    
    if (!data || chartData.length === 0) {
        return (
            <div className="h-80 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                Chưa có dữ liệu biểu đồ
            </div>
        );
    }

    // Transform data for Recharts
    const transformedData = chartData.map(item => ({
        name: item.testName || item.name || item.test?.name || 'Test',
        Nghe: item.listeningScore || item.listening || 0,
        Đọc: item.readingScore || item.reading || 0,
        Tổng: item.totalScore || item.total || 0,
    }));

    // Custom tooltip với styling đẹp hơn
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
    return (
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white text-sm rounded-xl px-4 py-3 shadow-2xl border border-gray-700 backdrop-blur-sm">
                    <div className="font-bold mb-3 pb-2 border-b border-gray-600 text-base">{label}</div>
                    <div className="space-y-2">
                        {payload.map((entry, index) => {
                            const colorMap = {
                                'Nghe': '#60a5fa',
                                'Đọc': '#fb923c',
                                'Tổng': '#34d399'
                            };
                        return (
                                <div key={index} className="flex items-center gap-3">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-gray-300">{entry.name}:</span>
                                    <span className="font-bold text-white text-base">{entry.value}</span>
                                </div>
                        );
                    })}
            </div>
                </div>
            );
        }
        return null;
    };


    return (
        <div className="w-full rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg">
            {/* Legend ở trên cùng */}
            <div className="flex justify-center gap-8 mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shadow-sm bg-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Nghe</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shadow-sm bg-orange-500" />
                    <span className="text-sm font-medium text-gray-700">Đọc</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shadow-sm bg-green-500" />
                    <span className="text-sm font-medium text-gray-700">Tổng</span>
                </div>
            </div>
            
            <ResponsiveContainer width="100%" height={420}>
                {chartType === 'line' ? (
                    <LineChart
                        data={transformedData}
                        margin={{ top: 10, right: 20, left: 10, bottom: 90 }}
                    >
                        <defs>
                            <linearGradient id="colorNghe" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorĐọc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorTổng" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="#e5e7eb" 
                            opacity={0.6}
                            vertical={false}
                        />
                        <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={90}
                            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                            interval={0}
                            stroke="#d1d5db"
                        />
                        <YAxis 
                            domain={[0, 990]}
                            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                            ticks={[200, 250, 300, 350, 400, 450, 495, 650, 800, 990]}
                            stroke="#d1d5db"
                            width={50}
                        />
                        <Tooltip 
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
                            animationDuration={200}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="Nghe" 
                            stroke="#3b82f6" 
                            strokeWidth={3.5}
                            dot={{ fill: '#3b82f6', r: 6, strokeWidth: 3, stroke: '#fff', className: 'drop-shadow-sm' }}
                            activeDot={{ r: 8, strokeWidth: 3, stroke: '#fff', fill: '#2563eb' }}
                            label={{ 
                                position: 'top', 
                                fill: '#3b82f6', 
                                fontSize: 11, 
                                fontWeight: 600,
                                offset: 8
                            }}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                        <Line 
                            type="monotone" 
                            dataKey="Đọc" 
                            stroke="#f97316" 
                            strokeWidth={3.5}
                            dot={{ fill: '#f97316', r: 6, strokeWidth: 3, stroke: '#fff', className: 'drop-shadow-sm' }}
                            activeDot={{ r: 8, strokeWidth: 3, stroke: '#fff', fill: '#ea580c' }}
                            label={{ 
                                position: 'top', 
                                fill: '#f97316', 
                                fontSize: 11, 
                                fontWeight: 600,
                                offset: 8
                            }}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                        <Line 
                            type="monotone" 
                            dataKey="Tổng" 
                            stroke="#10b981" 
                            strokeWidth={3.5}
                            dot={{ fill: '#10b981', r: 6, strokeWidth: 3, stroke: '#fff', className: 'drop-shadow-sm' }}
                            activeDot={{ r: 8, strokeWidth: 3, stroke: '#fff', fill: '#059669' }}
                            label={{ 
                                position: 'top', 
                                fill: '#10b981', 
                                fontSize: 11, 
                                fontWeight: 600,
                                offset: 8
                            }}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    </LineChart>
                ) : (
                    <BarChart
                        data={transformedData}
                        margin={{ top: 10, right: 20, left: 10, bottom: 90 }}
                    >
                        <defs>
                            <linearGradient id="barNghe" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="barĐọc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fb923c" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="barTổng" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#10b981" stopOpacity={1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="#e5e7eb" 
                            opacity={0.6}
                            vertical={false}
                        />
                        <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={90}
                            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                            interval={0}
                            stroke="#d1d5db"
                        />
                        <YAxis 
                            domain={[0, 990]}
                            tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                            ticks={[200, 250, 300, 350, 400, 450, 495, 650, 800, 990]}
                            stroke="#d1d5db"
                            width={50}
                        />
                        <Tooltip 
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
                            animationDuration={200}
                        />
                        <Bar 
                            dataKey="Nghe" 
                            fill="url(#barNghe)" 
                            radius={[6, 6, 0, 0]}
                            label={{ 
                                position: 'top', 
                                fill: '#3b82f6', 
                                fontSize: 11, 
                                fontWeight: 600,
                                offset: 5
                            }}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                        <Bar 
                            dataKey="Đọc" 
                            fill="url(#barĐọc)" 
                            radius={[6, 6, 0, 0]}
                            label={{ 
                                position: 'top', 
                                fill: '#f97316', 
                                fontSize: 11, 
                                fontWeight: 600,
                                offset: 5
                            }}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                        <Bar 
                            dataKey="Tổng" 
                            fill="url(#barTổng)" 
                            radius={[6, 6, 0, 0]}
                            label={{ 
                                position: 'top', 
                                fill: '#10b981', 
                                fontSize: 11, 
                                fontWeight: 600,
                                offset: 5
                            }}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};

const DEFAULT_PAGE_SIZE = 10;

const TestAnalytics = () => {
    const navigate = useNavigate();
    const [selectedDays, setSelectedDays] = useState(DEFAULT_DAYS);
    const [activeDays, setActiveDays] = useState(DEFAULT_DAYS);
    const [activeTab, setActiveTab] = useState('listening');
    const [activePart, setActivePart] = useState('Part 1');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyData, setHistoryData] = useState([]);
    const [historyMeta, setHistoryMeta] = useState({
        page: 0,
        pageSize: DEFAULT_PAGE_SIZE,
        pages: 1,
        total: 0
    });
    const [historyLoading, setHistoryLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [scoreStats, setScoreStats] = useState(null);
    const [scoreStatsLoading, setScoreStatsLoading] = useState(false);
    const [testLimit, setTestLimit] = useState(5);
    const [chartType, setChartType] = useState('line'); // 'line' or 'bar'

    const effectivePageSize = historyMeta.pageSize || DEFAULT_PAGE_SIZE;
    const totalRows = historyMeta.total;
    const totalPages = Math.max(1, historyMeta.pages || 1);
    const startRow = totalRows === 0 ? 0 : historyMeta.page * effectivePageSize + 1;
    const endRow = totalRows === 0 ? 0 : Math.min((historyMeta.page + 1) * effectivePageSize, totalRows);

    // Get current exam data based on activeTab
    const currentExam = analyticsData?.examList?.[activeTab === 'listening' ? 0 : 1];
    const currentPartData = currentExam?.userAnswersByPart?.[activePart] || [];
    
    // Calculate stats for current tab
    const totalQuestions = currentExam?.totalQuestions || 0;
    const totalCorrectAnswers = currentExam?.totalCorrectAnswers || 0;
    // Calculate accuracy from data if available, otherwise use API value
    const calculatedAccuracy = totalQuestions > 0 ? (totalCorrectAnswers / totalQuestions) * 100 : 0;
    const apiAccuracy = currentExam?.correctPercent != null ? Number(currentExam.correctPercent) : null;
    
    const currentStats = {
        totalQuestions,
        correctAnswers: totalCorrectAnswers,
        accuracy: apiAccuracy != null ? apiAccuracy : calculatedAccuracy,
    };

    // Get available parts from current exam
    const availableParts = currentExam?.userAnswersByPart ? Object.keys(currentExam.userAnswersByPart) : [];

    // Fetch analytics data
    useEffect(() => {
        const fetchAnalytics = async () => {
            setAnalyticsLoading(true);
            try {
                const query = new URLSearchParams({
                    days: activeDays
                }).toString();

                const response = await getTestAnalytics(query);
                const data = response?.data;

                setAnalyticsData(data);
            } catch (error) {
                console.error('Error fetching analytics:', error);
                message.error('Không thể tải dữ liệu thống kê');
                setAnalyticsData(null);
            } finally {
                setAnalyticsLoading(false);
            }
        };

        fetchAnalytics();
    }, [activeDays]);

    // Reset activePart when switching tabs or when data changes
    useEffect(() => {
        if (analyticsData?.examList) {
            const examIndex = activeTab === 'listening' ? 0 : 1;
            const exam = analyticsData.examList[examIndex];
            if (exam?.userAnswersByPart) {
                const parts = Object.keys(exam.userAnswersByPart).filter(p => p !== 'Total');
                if (parts.length > 0) {
                    // Only set if current part is not available in new tab
                    if (!parts.includes(activePart)) {
                        setActivePart(parts[0]);
                    }
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, analyticsData]);

    useEffect(() => {
        const fetchHistory = async () => {
            setHistoryLoading(true);
            try {
                const query = new URLSearchParams({
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
    }, [historyPage]);

    // Fetch score statistics (using mock data for now)
    useEffect(() => {
        const fetchScoreStats = async () => {
            setScoreStatsLoading(true);
            try {
                const response = await getScoreStatistics(testLimit);
                const payload = response?.data;

                const normalizedData = {
                    averageScore: payload?.averageScore ?? 0,
                    highestScore: payload?.highestScore ?? 0,
                    averageListeningScore: payload?.averageListeningScore ?? 0,
                    maxListeningScore: payload?.maxListeningScore ?? 0,
                    averageReadingScore: payload?.averageReadingScore ?? 0,
                    maxReadingScore: payload?.maxReadingScore ?? 0,
                    chartData: (payload?.examTypeFullTestResponses || []).map(item => ({
                        testName: item.name || `Test ${item.id}`,
                        listeningScore: item.listeningScore ?? 0,
                        readingScore: item.readingScore ?? 0,
                        totalScore: item.totalScore ?? 0,
                        createdAt: item.createdAt,
                        id: item.id
                    }))
                };

                setScoreStats(normalizedData);
            } catch (error) {
                console.error('Error fetching score statistics:', error);
                message.error('Không thể tải thống kê điểm TOEIC');
                setScoreStats(null);
            } finally {
                setScoreStatsLoading(false);
            }
        };

        fetchScoreStats();
    }, [testLimit]);

    const hasScoreData = Boolean(scoreStats && (scoreStats.chartData?.length ?? 0) > 0);

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
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium text-gray-700">
                                Lọc kết quả theo ngày (tính từ bài thi cuối):
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={selectedDays}
                                    onChange={(e) => setSelectedDays(e.target.value)}
                                    className="w-full sm:w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                >
                                    {DAY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                    <button
                                        onClick={() => {
                                        setActiveDays(selectedDays);
                                            setHistoryPage(1);
                                        }}
                                    className="flex-1 sm:flex-none px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Tìm kiếm
                                    </button>
                                </div>
                            </div>
                        </div>

                    {analyticsLoading ? (
                        <div className="flex justify-center py-8">
                            <Spin />
                    </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card title="Số lượt thi" value={analyticsData?.numberOfSubmissions || 0} subtitle="lượt" />
                            <Card title="Số đề đã làm" value={analyticsData?.numberOfTests || 0} subtitle="đề thi" />
                            <Card title="Thời gian luyện thi" value={secondsToMinutes(analyticsData?.totalTimes || 0)} subtitle="phút" />
                        <Card
                            title="Điểm mục tiêu"
                                value="Chưa thiết lập"
                                subtitle="Tạo ngay"
                                highlight={true}
                        />
                    </div>
                    )}

                    <div className="flex gap-3 mt-8 mb-6">
                        <button
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                activeTab === 'listening'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => setActiveTab('listening')}
                        >
                            Listening
                        </button>
                        <button
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                activeTab === 'reading'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => setActiveTab('reading')}
                        >
                            Reading
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 max-w-2xl mb-6">
                        <Card 
                            title="Số câu hỏi đã luyện" 
                            value={currentStats.totalQuestions || 0} 
                            subtitle="câu hỏi" 
                        />
                        <Card 
                            title="Độ chính xác" 
                            value={`${currentStats.accuracy != null ? Number(currentStats.accuracy).toFixed(2) : '0.00'}%`}
                            subtitle={currentStats.totalQuestions > 0 ? `${currentStats.correctAnswers || 0}/${currentStats.totalQuestions} câu đúng` : 'Chưa có dữ liệu'}
                        />
                    </div>

                    {availableParts.length > 0 && (
                        <>
                            <div className="flex gap-2 mb-4 flex-wrap">
                                {availableParts.map((part) => (
                                    part !== 'Total' && (
                                        <button
                                            key={part}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                activePart === part
                                                    ? 'bg-blue-600 text-white shadow'
                                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                            onClick={() => setActivePart(part)}
                                        >
                                            {part}
                                        </button>
                                    )
                                ))}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr className="text-sm text-gray-500">
                                            <th className="px-4 py-3 text-left font-medium">Phân loại câu hỏi</th>
                                            <th className="px-4 py-3 text-center font-medium">Số câu đúng</th>
                                            <th className="px-4 py-3 text-center font-medium">Số câu sai</th>
                                            <th className="px-4 py-3 text-center font-medium">Độ chính xác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                        {analyticsLoading ? (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-gray-500">
                                                    <Spin />
                                                </td>
                                            </tr>
                                        ) : currentPartData.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-gray-500">
                                                    Không có dữ liệu
                                                </td>
                                            </tr>
                                        ) : (
                                            currentPartData.map((item, idx) => {
                                                // Calculate percentage from correctAnswers and wrongAnswers for verification
                                                const total = (item.correctAnswers || 0) + (item.wrongAnswers || 0);
                                                const calculatedPercent = total > 0 ? ((item.correctAnswers || 0) / total) * 100 : 0;
                                                // Use API value if available, otherwise calculate
                                                const displayPercent = item.correctPercent != null ? Number(item.correctPercent) : calculatedPercent;
                                                const isTotal = item.tag === 'Total';
                                                
                                                return (
                                                    <tr 
                                                        key={idx} 
                                                        className={isTotal 
                                                            ? "bg-blue-50 border-t-2 border-blue-200 font-semibold" 
                                                            : "hover:bg-gray-50"
                                                        }
                                                    >
                                                        <td className={`px-4 py-3 ${isTotal ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>
                                                            {item.tag}
                                                        </td>
                                                        <td className={`px-4 py-3 text-center ${isTotal ? 'text-blue-900 font-bold' : 'font-semibold text-gray-900'}`}>
                                                            {item.correctAnswers || 0}
                                                        </td>
                                                        <td className={`px-4 py-3 text-center ${isTotal ? 'text-blue-800 font-semibold' : 'text-gray-600'}`}>
                                                            {item.wrongAnswers || 0}
                                                        </td>
                                                        <td className={`px-4 py-3 text-center ${isTotal ? 'text-blue-900 font-bold' : 'font-semibold text-gray-900'}`}>
                                                            {displayPercent.toFixed(2)}%
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Score Statistics Section */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Tổng quan điểm số</h3>
                            <p className="text-sm text-gray-500 mt-1">{testLimit} đề gần nhất</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={testLimit}
                                onChange={(e) => setTestLimit(Number(e.target.value))}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value={3}>3 đề</option>
                                <option value={5}>5 đề</option>
                                <option value={7}>7 đề</option>
                                <option value={10}>10 đề</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setChartType('line')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        chartType === 'line'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    Đường
                                </button>
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        chartType === 'bar'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    Cột
                                </button>
                            </div>
                        </div>
                    </div>

                    {scoreStatsLoading ? (
                        <div className="flex justify-center py-12">
                            <Spin />
                        </div>
                    ) : hasScoreData ? (
                        <>
                            {/* Statistics Cards */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                                <Card 
                                    title="Điểm trung bình" 
                                    value={scoreStats.averageScore ? Math.round(scoreStats.averageScore) : 0} 
                                    subtitle={`/990`} 
                                />
                                <Card 
                                    title="Điểm cao nhất" 
                                    value={scoreStats.highestScore || 0} 
                                    subtitle={`/990`} 
                                />
                                <Card 
                                    title="Điểm Listening TB" 
                                    value={scoreStats.averageListeningScore ? Math.round(scoreStats.averageListeningScore) : 0} 
                                    subtitle={`Cao nhất: ${scoreStats.maxListeningScore || 0}`} 
                                />
                                <Card 
                                    title="Điểm Reading TB" 
                                    value={scoreStats.averageReadingScore ? Math.round(scoreStats.averageReadingScore) : 0} 
                                    subtitle={`Cao nhất: ${scoreStats.maxReadingScore || 0}`} 
                                />
                </div>

                            {/* Chart */}
                            <ScoreChart data={scoreStats} chartType={chartType} />
                        </>
                    ) : (
                        <div className="h-80 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-500 text-sm text-center px-6">
                            Bạn cần hoàn thành bài Full Test để xem thống kê điểm số tại đây.
                        </div>
                    )}
                </div>

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
                    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-sm text-gray-600">
                            Hiển thị <span className="font-semibold text-gray-900">{startRow}</span> - <span className="font-semibold text-gray-900">{endRow}</span> trong tổng số <span className="font-semibold text-gray-900">{totalRows}</span> kết quả
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                                disabled={historyPage === 1}
                                className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    historyPage === 1
                                        ? 'text-gray-300 bg-gray-50 border border-gray-200 cursor-not-allowed'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 shadow-sm hover:shadow'
                                }`}
                                aria-label="Trang trước"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {(() => {
                                    const pages = [];
                                    const maxVisible = 5;
                                    
                                    if (totalPages <= maxVisible) {
                                        // Hiển thị tất cả các trang nếu ít hơn maxVisible
                                        for (let i = 1; i <= totalPages; i++) {
                                            pages.push(i);
                                        }
                                    } else {
                                        // Logic hiển thị trang với ellipsis
                                        if (historyPage <= 3) {
                                            // Gần đầu: 1, 2, 3, 4, ..., last
                                            for (let i = 1; i <= 4; i++) {
                                                pages.push(i);
                                            }
                                            pages.push('ellipsis');
                                            pages.push(totalPages);
                                        } else if (historyPage >= totalPages - 2) {
                                            // Gần cuối: 1, ..., n-3, n-2, n-1, n
                                            pages.push(1);
                                            pages.push('ellipsis');
                                            for (let i = totalPages - 3; i <= totalPages; i++) {
                                                pages.push(i);
                                            }
                                        } else {
                                            // Ở giữa: 1, ..., current-1, current, current+1, ..., last
                                            pages.push(1);
                                            pages.push('ellipsis');
                                            for (let i = historyPage - 1; i <= historyPage + 1; i++) {
                                                pages.push(i);
                                            }
                                            pages.push('ellipsis');
                                            pages.push(totalPages);
                                        }
                                    }
                                    
                                    return pages.map((page, idx) => {
                                        if (page === 'ellipsis') {
                                            return (
                                                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                                                    ...
                                                </span>
                                            );
                                        }
                                        
                                        const isActive = page === historyPage;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setHistoryPage(page)}
                                                className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                    isActive
                                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200 scale-105'
                                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 shadow-sm hover:shadow'
                                                }`}
                                            >
                                                {page}
                            </button>
                                        );
                                    });
                                })()}
                            </div>
                            
                            <button
                                onClick={() => setHistoryPage(page => Math.min(totalPages, page + 1))}
                                disabled={historyPage === totalPages}
                                className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    historyPage === totalPages
                                        ? 'text-gray-300 bg-gray-50 border border-gray-200 cursor-not-allowed'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 shadow-sm hover:shadow'
                                }`}
                                aria-label="Trang sau"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestAnalytics;
