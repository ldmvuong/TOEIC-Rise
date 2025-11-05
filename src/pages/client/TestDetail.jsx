import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPublicTestById } from '../../api/api';
import { Spin, Select, message } from 'antd';
import { useAppSelector } from '../../redux/hooks';

const TagChip = ({ children }) => (
    <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-800 rounded-full border border-gray-200">
        {children}
    </span>
);

const PART_QUESTION_COUNTS = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 };

const PartSection = ({ part }) => {
    const questionCount = PART_QUESTION_COUNTS[part.partId] ?? 0;
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900">{part.partName}</h3>
                <span className="text-xs text-gray-400">({questionCount} câu hỏi)</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {(part.tagNames || []).map((tag, idx) => (
                    <TagChip key={idx}>{tag}</TagChip>
                ))}
            </div>
        </div>
    );
};

const TestDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('practice');

    const goLogin = () => {
        const cb = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
        navigate(`/auth?callback=${cb}`);
    };

    // Mock result data (until API is available)
    const resultsColumns = [
        {
            title: 'Ngày làm',
            dataIndex: 'date',
            key: 'date',
            render: (_, row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.date}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                        <Tag color={row.mode === 'Full test' ? 'green' : 'orange'}>{row.mode}</Tag>
                        {row.parts.map((p) => (
                            <Tag key={p} color="gold" className="m-0">{p}</Tag>
                        ))}
                    </div>
                </div>
            )
        },
        { title: 'Kết quả', dataIndex: 'result', key: 'result' },
        { title: 'Thời gian làm bài', dataIndex: 'time', key: 'time' },
        { title: '', key: 'action', render: () => <span className="text-blue-600 font-medium cursor-pointer">Xem chi tiết</span> }
    ];

    const resultsData = [
        { key: 1, date: '29/10/2025', mode: 'Luyện tập', parts: ['Part 7'], result: '1/54', time: '0:00:14' },
        { key: 2, date: '29/10/2025', mode: 'Luyện tập', parts: ['Part 1', 'Part 2'], result: '0/31', time: '0:00:04' },
        { key: 3, date: '26/09/2025', mode: 'Full test', parts: [], result: '6/200 (Điểm: 40)', time: '0:00:58' },
    ];

    const parsedId = useMemo(() => {
        const parsed = Number(id);
        return Number.isFinite(parsed) ? parsed : null;
    }, [id]);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!parsedId) return;
            setLoading(true);
            try {
                const res = await getPublicTestById(parsedId);
                setData(res.data);
            } catch (e) {
                message.error('Không thể tải chi tiết đề thi');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [parsedId]);

    if (loading) {
        return <Spin size="large" fullscreen tip="Đang tải chi tiết đề thi..." />;
    }

    if (!data) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center text-gray-600">Không tìm thấy đề thi</div>
            </div>
        );
    }

    const learnersCount = Number(data.numberOfLearnedTests || 0).toLocaleString();

    return (
        <div className="min-h-screen bg-white">
            {/* Page header */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
                <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">#TOEIC</span>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                    Practice Set TOEIC 2022 {data.testName}
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white text-sm">✓</span>
                </h1>
                <div className="mt-4 text-gray-700">
                    <p className="mt-1 text-sm italic text-rose-600">Chú ý: để được quy đổi sang scaled score (ví dụ trên thang điểm 990 cho TOEIC hoặc 9.0 cho IELTS), vui lòng chọn chế độ làm FULL TEST.</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 mb-14">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left/Main */}
                    <div className="lg:col-span-2">
                        {/* Results table (mock) */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Kết quả làm bài của bạn</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-700 border border-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 border border-gray-200">Ngày làm</th>
                                            <th className="px-4 py-3 border border-gray-200">Kết quả</th>
                                            <th className="px-4 py-3 border border-gray-200">Thời gian làm bài</th>
                                            <th className="px-4 py-3 border border-gray-200"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[{ date: '29/10/2025', mode: 'Luyện tập', parts: ['Part 7'], result: '1/54', time: '0:00:14' },
                                        { date: '29/10/2025', mode: 'Luyện tập', parts: ['Part 1', 'Part 2'], result: '0/31', time: '0:00:04' },
                                        { date: '26/09/2025', mode: 'Full test', parts: [], result: '6/200 (Điểm: 40)', time: '0:00:58' }].map((row, idx) => (
                                            <tr key={idx} className="odd:bg-white even:bg-gray-50">
                                                <td className="px-4 py-3 border border-gray-200 align-top">
                                                    <div className="font-medium text-gray-900">{row.date}</div>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${row.mode === 'Full test' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{row.mode}</span>
                                                        {row.parts.map(p => (
                                                            <span key={p} className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">{p}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 border border-gray-200">{row.result}</td>
                                                <td className="px-4 py-3 border border-gray-200">{row.time}</td>
                                                <td className="px-4 py-3 border border-gray-200 text-blue-600 font-medium cursor-pointer">Xem chi tiết</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="mt-6 bg-white border border-gray-200 rounded-xl">
                            <div className="px-5 pt-4">
                                <div className="flex gap-8 border-b border-gray-200">
                                    {['practice', 'full'].map(key => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key)}
                                            className={`py-3 text-sm font-medium ${activeTab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
                                        >
                                            {key === 'practice' ? 'Luyện tập' : 'Làm full test'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-5 md:p-6">
                                {activeTab === 'practice' && (
                                    <>
                                        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-800 p-3 text-sm">💡 Pro tips: Hình thức luyện tập từng phần và chọn mức thời gian phù hợp sẽ giúp bạn tập trung vào giải đúng các câu hỏi.</div>
                                        <div className="space-y-3">
                                            {(data.learnerPartResponses || []).map((part) => (
                                                <PartSection key={part.partId} part={part} />
                                            ))}
                                        </div>
                                        {/* Time limit for practice - gated by auth */}
                                        <div className="mt-6">
                                            {isAuthenticated ? (
                                                <div className="flex flex-col md:flex-row md:items-end gap-4">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Giới hạn thời gian (tùy chọn)</label>
                                                        <Select
                                                            placeholder="-- Không giới hạn --"
                                                            className="w-full"
                                                            options={[
                                                                { value: 10, label: '10 phút' },
                                                                { value: 20, label: '20 phút' },
                                                                { value: 30, label: '30 phút' },
                                                                { value: 60, label: '60 phút' },
                                                            ]}
                                                        />
                                                    </div>
                                                    <button className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">BẮT ĐẦU LUYỆN TẬP</button>
                                                </div>
                                            ) : (
                                                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                                                    <div className="text-gray-700">Đăng nhập để đặt thời gian và lưu tiến độ luyện tập.</div>
                                                    <button onClick={goLogin} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Đăng nhập ngay</button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                {activeTab === 'full' && (
                                    <>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm">⚠️ Sẵn sàng để bắt đầu làm full test? Để đạt được kết quả tốt nhất, bạn cần dành ra 120 phút cho bài test này.</div>
                                        <div className="mt-4 flex justify-end">
                                            {isAuthenticated ? (
                                                <button className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">BẮT ĐẦU THI</button>
                                            ) : (
                                                <div className="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                                                    <div className="text-gray-700">Bạn cần đăng nhập để làm full test.</div>
                                                    <button onClick={goLogin} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Đăng nhập ngay</button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                            </div>
                        </div>
                    </div>

                    {/* Right/Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-6 space-y-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Thời lượng</div>
                                        <div className="text-lg font-semibold text-gray-900">120 phút</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Số phần</div>
                                        <div className="text-lg font-semibold text-gray-900">7</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-xs text-gray-500">Câu hỏi</div>
                                        <div className="text-lg font-semibold text-gray-900">200</div>
                                    </div>
                                </div>
                                <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                                    📌 Mẹo: Hãy luyện tập từng phần trước khi làm Full Test để làm quen dạng câu hỏi.
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestDetail;

