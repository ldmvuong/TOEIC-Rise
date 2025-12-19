const PartsTabs = ({ parts, selectedIndex, onSelect }) => {
    if (!parts || parts.length === 0) {
        return (
            <div className="bg-white shadow rounded p-3">
                <div className="text-sm text-gray-500">No part data available.</div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded px-2 py-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {parts.map((p, idx) => {
                    const isActive = idx === selectedIndex;
                    return (
                        <button
                            key={p.id}
                            className={`whitespace-nowrap px-3 py-1.5 rounded border text-sm transition ${
                                isActive
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => onSelect(idx)}
                            title={p.name}
                        >
                            {p.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PartsTabs;


