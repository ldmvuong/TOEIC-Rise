import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import StatisticalResults from '../../components/exam/StatisticalResults';
import AnswerSheet from '../../components/exam/AnswerSheet';

const TestResult = () => {
    const { userTestId } = useParams();
    const answerSheetRef = useRef(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

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
                        onViewAnswers={handleViewAnswers}
                    />
                </div>

                {/* Answer Sheet Section */}
                <div ref={answerSheetRef}>
                    <AnswerSheet 
                        userTestId={userTestId}
                    />
                </div>
            </div>
        </div>
    );
};

export default TestResult;

