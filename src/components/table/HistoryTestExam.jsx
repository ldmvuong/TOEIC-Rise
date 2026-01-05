import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTestHistory } from '../../api/api';
import dayjs from 'dayjs';
import { message } from 'antd';
import { useAppSelector } from '../../redux/hooks';

const HistoryTestExam = ({ testId, isAuthenticated }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const userRole = useAppSelector(state => state.account.user?.role);
    const isLearner = userRole === 'LEARNER';

    useEffect(() => {
        if (!isAuthenticated || !isLearner || !testId) {
            return;
        }

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await getUserTestHistory(testId);
                setHistoryData(response.data || []);
            } catch (error) {
                console.error('Error fetching test history:', error);
                message.error('Không thể tải lịch sử làm bài');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [testId, isAuthenticated, isLearner]);

    if (!isAuthenticated || !isLearner) {
        return null;
    }

    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return dayjs(dateString).format('DD/MM/YYYY');
    };

    // Format time to always show HH:MM:SS format (even for short durations)
    const formatTimeDisplay = (seconds) => {
        if (!seconds || seconds <= 0) return '0:00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Format result based on mode
    const formatResult = (item) => {
        const correctAnswers = item.correctAnswers ?? 0;
        const totalQuestions = item.totalQuestions ?? 0;
        const result = `${correctAnswers}/${totalQuestions}`;
        // If parts is null, it's Full test mode - show totalScore
        if (item.parts === null) {
            const totalScore = item.totalScore !== null && item.totalScore !== undefined ? item.totalScore : 0;
            return `${result} (Điểm: ${totalScore})`;
        }
        // Practice mode - don't show totalScore
        return result;
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Kết quả làm bài của bạn</h2>
                <div className="text-center py-8 text-gray-500">Đang tải...</div>
            </div>
        );
    }

    if (historyData.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Kết quả làm bài của bạn</h2>
                <div className="text-center py-8 text-gray-500">
                    <p className="text-base">Bạn chưa làm đề này.</p>
                    <p className="text-sm mt-2">Hãy bắt đầu làm bài để xem kết quả tại đây.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Kết quả làm bài của bạn</h2>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <div className="relative overflow-y-auto" style={{ maxHeight: '320px' }}>
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-200">Ngày làm</th>
                                <th className="px-4 py-3 border-b border-gray-200">Kết quả</th>
                                <th className="px-4 py-3 border-b border-gray-200">Thời gian làm bài</th>
                                <th className="px-4 py-3 border-b border-gray-200"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyData.map((item) => {
                                const isFullTest = item.parts && item.parts.length > 0 === false;
                                const mode = isFullTest ? 'Full test' : 'Luyện tập';
                                // Support both createAt and createdAt field names
                                const dateField = item.createAt || item.createdAt;
                                
                                return (
                                    <tr key={item.id} className="odd:bg-white even:bg-gray-50 border-b border-gray-200 last:border-b-0">
                                        <td className="px-4 py-3 align-top">
                                            <div className="font-medium text-gray-900">{formatDate(dateField)}</div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded ${
                                                        isFullTest
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}
                                                >
                                                    {mode}
                                                </span>
                                                {item.parts && item.parts.map((part, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200"
                                                    >
                                                        {part}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{formatResult(item)}</td>
                                        <td className="px-4 py-3">{formatTimeDisplay(item.timeSpent)}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => {
                                                    if (item.id) {
                                                        navigate(`/test-result/${item.id}`);
                                                    } else {
                                                        message.error('Không tìm thấy ID bài thi');
                                                    }
                                                }}
                                                className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 hover:underline"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoryTestExam;

