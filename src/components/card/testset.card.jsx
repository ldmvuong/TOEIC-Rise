import React from 'react';

const TestSetCard = ({ testSet, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-4 cursor-pointer border border-gray-200 hover:border-blue-500 group min-w-[180px]"
        >
            {/* Test Set Name */}
            <div className="text-center">
                <h3 className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
                    {testSet?.name || 'Test Set'}
                </h3>
            </div>
        </div>
    );
};

export default TestSetCard;

