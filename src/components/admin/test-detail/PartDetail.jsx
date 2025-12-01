import parse from "html-react-parser";
import { useNavigate } from "react-router-dom";
import { EyeOutlined } from "@ant-design/icons";

const PartDetail = ({ part }) => {
    const navigate = useNavigate();

    if (!part) {
        return (
            <div className="md:col-span-3 bg-white shadow rounded p-4">
                <div className="text-gray-500">Chưa có dữ liệu part.</div>
            </div>
        );
    }

    // Extract part number from part.name (e.g. "Part 2" -> 2)
    const partNumber = part?.name ? parseInt(part.name.replace(/[^0-9]/g, '')) : null;
    const isPart2 = partNumber === 2;

    return (
        <div className="md:col-span-3 bg-white shadow rounded p-4">
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-lg font-semibold">{part.name}</div>
                    <div className="text-sm text-gray-500">{part.questionGroups?.length || 0} nhóm</div>
                </div>

                <div className="space-y-4">
                    {part.questionGroups?.map((group, idx) => {
                        const firstPos = group?.questions?.[0]?.position;
                        const lastPos = group?.questions?.[group.questions.length - 1]?.position;
                        const range = firstPos && lastPos && firstPos !== lastPos ? `${firstPos} - ${lastPos}` : (firstPos || "");
                        return (
                            <div
                                key={group.id}
                                className={`relative rounded-lg border shadow-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} overflow-hidden`}
                            >
                                <span className={`absolute left-0 top-0 bottom-0 w-1 ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-indigo-500'}`} />

                                {/* Header */}
                                <div className="px-4 py-3 border-b bg-gray-50/60 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium">Câu hỏi {range ? `(${range})` : ''}</span>
                                        <div className="flex items-center gap-1">
                                            {group.audioUrl && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Audio</span>}
                                            {group.imageUrl && <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Hình</span>}
                                            {group.passage && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Đoạn văn</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">{(group.questions || []).length} câu</span>
                                        <button
                                            onClick={() => {
                                                // Extract part number from part.name (e.g., "Part 1" -> 1)
                                                const partNumber = part?.name ? parseInt(part.name.replace(/[^0-9]/g, '')) : null;
                                                navigate(`/admin/question-groups/${group.id}`, {
                                                    state: { partNumber }
                                                });
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                                            title="Xem chi tiết nhóm câu hỏi"
                                        >
                                            <EyeOutlined />
                                            Xem chi tiết
                                        </button>
                                    </div>
                                </div>

                                {/* Media / Passage */}
                                <div className="p-4 space-y-3">
                                    {group.audioUrl && (
                                        <audio controls className="w-full">
                                            <source src={group.audioUrl} />
                                        </audio>
                                    )}
                                    {group.imageUrl && (
                                        <div className="w-full">
                                            <img src={group.imageUrl} alt="question" className="max-h-72 mx-auto object-contain rounded" />
                                        </div>
                                    )}
                                    {group.passage && (
                                        <div className="text-sm bg-white p-3 rounded border">
                                            {parse(group.passage)}
                                        </div>
                                    )}

                                    {/* Questions */}
                                    <div className="mt-1 grid grid-cols-1 gap-3">
                                        {group.questions?.map((q) => (
                                            <div key={q.id} className="rounded border bg-white p-3">
                                                <div className="flex items-start gap-2">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold shrink-0">
                                                        {q.position}
                                                    </span>
                                                    <div className="flex-1">
                                                        {q.content && (
                                                            <div className="text-sm mb-2">{q.content}</div>
                                                        )}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                                            {(isPart2 ? (q.options || []).slice(0, 3) : (q.options || [])).map((opt, optIdx) => {
                                                                const label = String.fromCharCode(65 + optIdx);
                                                                const isCorrect = q.correctOption === label;
                                                                return (
                                                                    <div key={optIdx} className={`px-2 py-1 rounded border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                                        <span className={`inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold mr-2 rounded ${isCorrect ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'}`}>
                                                                            {label}
                                                                        </span>
                                                                        <span>{opt || '-'}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PartDetail;


