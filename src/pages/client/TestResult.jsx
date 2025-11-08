import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import StatisticalResults from '../../components/exam/StatisticalResults';
import AnswerSheet from '../../components/exam/AnswerSheet';
import { getUserTestStatisticsResult } from '../../api/api';

const TestResult = () => {
    const { userTestId } = useParams();
    const navigate = useNavigate();
    const [testData, setTestData] = useState(null);
    const answerSheetRef = useRef(null);

    useEffect(() => {
        const fetchTestData = async () => {
            if (!userTestId) {
                message.error('Không tìm thấy ID bài thi');
                navigate('/online-tests');
                return;
            }

            try {
                const statsResponse = await getUserTestStatisticsResult(userTestId);
                if (statsResponse && statsResponse.data) {
                    setTestData({
                        testId: statsResponse.data.testId,
                        testName: statsResponse.data.testName
                    });
                }
            } catch (error) {
                console.error('Error fetching test data:', error);
                message.error('Không thể tải dữ liệu bài thi');
            }
        };

        fetchTestData();
    }, [userTestId, navigate]);

    const handleViewAnswers = () => {
        // Scroll to answer sheet section
        if (answerSheetRef.current) {
            answerSheetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                {/* Statistical Results Section */}
                <div className="mb-6">
                    <StatisticalResults 
                        userTestId={userTestId}
                        testId={testData?.testId}
                        onViewAnswers={handleViewAnswers}
                    />
                </div>

                {/* Answer Sheet Section */}
                <div ref={answerSheetRef}>
                    <AnswerSheet userTestId={userTestId} testId={testData?.id} />
                </div>
            </div>
        </div>
    );
};

export default TestResult;

