import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenIcon, UserIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';
import { message } from 'antd';
import { callAddToFavourite, callRemoveFromFavourite } from '../../api/api';

const FlashcardCard = ({ item, activeTab, onFavouriteChange }) => {
    const navigate = useNavigate();
    
    // Đảm bảo favourite mặc định là false nếu API chưa trả về
    const isFavourite = item.favourite ?? false;

    // Xử lý Yêu thích/Bỏ yêu thích
    const handleToggleFavourite = async (e) => {
        e.stopPropagation(); // Ngăn event bubble lên card
        e.preventDefault(); // Ngăn default behavior
        
        // Lấy id từ data attribute hoặc từ item để đảm bảo đúng item được click
        const flashcardId = e.currentTarget.dataset.id || item.id;
        const currentFavouriteStatus = e.currentTarget.dataset.favourite === 'true' || (item.favourite ?? false);
        
        try {
            if (currentFavouriteStatus) {
                await callRemoveFromFavourite(flashcardId);
                message.success("Đã xóa khỏi yêu thích");
            } else {
                await callAddToFavourite(flashcardId);
                message.success("Đã thêm vào yêu thích");
            }
            
            // Gọi callback để refresh data nếu có
            if (onFavouriteChange) {
                onFavouriteChange();
            }
        } catch (error) {
            message.error(error?.message || "Có lỗi xảy ra");
        }
    };

    // Xử lý click vào card - navigate đến trang xem
    const handleCardClick = () => {
        navigate(`/flashcards/${item.id}`);
    };


    return (
        <div 
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col overflow-hidden group cursor-pointer relative"
            onClick={handleCardClick}
        >
            {/* Header với gradient - có nút favourite ở góc phải */}
            <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500 p-4 flex justify-center items-center relative">
                <BookOpenIcon className="w-12 h-12 text-white opacity-80" />
                
                {/* Favourite button - góc phải trên cùng */}
                <button 
                    onClick={handleToggleFavourite}
                    data-id={item.id}
                    data-favourite={isFavourite}
                    className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all z-10"
                    title={isFavourite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                >
                    {isFavourite ? (
                        <HeartSolid className="w-5 h-5 text-red-500" />
                    ) : (
                        <HeartIcon className="w-5 h-5 text-white" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                {/* Title và Access Type */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-lg text-gray-800 line-clamp-2 flex-1 min-h-[3.5rem]">
                        {item.name || 'Untitled'}
                    </h3>
                    {item.accessType && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                            item.accessType === 'PUBLIC' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                            {item.accessType === 'PUBLIC' ? 'Public' : 'Private'}
                        </span>
                    )}
                </div>

                {/* Item Count */}
                <div className="text-sm text-gray-500 mb-3">
                    <span>{item.itemCount || 0} từ vựng</span>
                </div>

                {/* Author và Favourite Count - layout 2 cột */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                    {/* Author - bên trái */}
                    {item.authorFullName && (
                        <div className="flex items-center gap-1.5">
                            <UserIcon className="w-4 h-4" />
                            <span>{item.authorFullName}</span>
                        </div>
                    )}
                    
                    {/* Favourite Count - bên phải */}
                    {item.favouriteCount !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <HeartSolid className="w-4 h-4 text-red-400" />
                            <span>{item.favouriteCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlashcardCard;
