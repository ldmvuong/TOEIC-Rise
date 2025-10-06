const PartsSidebar = ({ parts, selectedIndex, onSelect }) => {
    if (!parts || parts.length === 0) {
        return (
            <div className="md:col-span-1 bg-white shadow rounded p-3 h-max">
                <div className="font-medium mb-2">Danh sách Part</div>
                <div className="text-sm text-gray-500">Chưa có dữ liệu part.</div>
            </div>
        );
    }

    return (
        <div className="md:col-span-1 bg-white shadow rounded p-3 h-max">
            <div className="font-medium mb-2">Danh sách Part</div>
            <div className="flex flex-col gap-2">
                {parts.map((p, idx) => {
                    const isActive = idx === selectedIndex;
                    return (
                        <button
                            key={p.id}
                            className={`text-left px-3 py-2 rounded border transition ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                            onClick={() => onSelect(idx)}
                        >
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-gray-500">{p.questionGroups?.length || 0} nhóm câu hỏi</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PartsSidebar;


