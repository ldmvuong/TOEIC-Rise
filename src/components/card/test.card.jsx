import React from 'react';
import { ClockCircleOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';

const TestCard = ({ test, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-400 overflow-hidden group"
        >
            {/* Card Content */}
            <div className="p-5">
                {/* Test Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
                    {test?.testName || 'Test Title'}
                </h3>

                {/* Test Set Name */}
                <div className="mb-4">
                    <div className="inline-flex items-center px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                        <span className="text-sm font-medium text-blue-700">
                            {test?.testSetName || 'Test Set'}
                        </span>
                    </div>
                </div>

                {/* Test Details */}
                <div className="space-y-3 mb-4">
                    {/* Duration */}
                    <div className="flex items-center text-gray-600 text-sm">
                        <ClockCircleOutlined className="mr-2 text-blue-500" />
                        <span>120 phút</span>
                    </div>

                    {/* Learners Count */}
                    <div className="flex items-center text-gray-600 text-sm pt-2 border-t border-gray-100">
                        <UserOutlined className="mr-2 text-blue-500" />
                        <span className="font-semibold">
                            {test?.numberOfLearnerTests || 0} lượt làm bài
                        </span>
                    </div>
                </div>

                {/* Details Button */}
                <button className="w-full py-2 px-4 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-500 hover:text-white transition-all duration-300 hover:shadow-md">
                    Chi tiết
                </button>
            </div>
        </div>
    );
};

export default TestCard;

