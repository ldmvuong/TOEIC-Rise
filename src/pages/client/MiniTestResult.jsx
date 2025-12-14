import { useLocation } from 'react-router-dom';

const MiniTestResult = () => {
    const location = useLocation();
    const resultData = location.state?.resultData;
    const testData = location.state?.testData;
    const selectedTags = location.state?.selectedTags || [];

    // TODO: Implement result display
    console.log('Result Data:', resultData);
    console.log('Test Data:', testData);
    console.log('Selected Tags:', selectedTags);

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="max-w-6xl mx-auto px-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Kết quả Mini Test</h1>
                <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-gray-600">Kết quả sẽ được hiển thị ở đây...</p>
                </div>
            </div>
        </div>
    );
};

export default MiniTestResult;
