import parse from "html-react-parser";

/**
 * Writing test detail: parts → question groups (image, passage) → questions (id, position only in API).
 */
const WritingPartDetail = ({ part }) => {
    if (!part) {
        return (
            <div className="md:col-span-3 bg-white shadow rounded p-4">
                <div className="text-gray-500">No part data available.</div>
            </div>
        );
    }

    return (
        <div className="md:col-span-3 bg-white shadow rounded p-4">
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-lg font-semibold">{part.name}</div>
                    <div className="text-sm text-gray-500">
                        {part.questionGroups?.length || 0} groups
                    </div>
                </div>

                <div className="space-y-4">
                    {part.questionGroups?.map((group, idx) => (
                        <div
                            key={group.id}
                            className={`relative rounded-lg border shadow-sm ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} overflow-hidden`}
                        >
                            <span
                                className={`absolute left-0 top-0 bottom-0 w-1 ${idx % 2 === 0 ? "bg-blue-500" : "bg-indigo-500"}`}
                            />

                            <div className="px-4 py-3 border-b bg-gray-50/60 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">
                                        Group {group.position != null ? `#${group.position}` : ""}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {group.imageUrl && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                                Image
                                            </span>
                                        )}
                                        {group.passage && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                                Passage
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {(group.questions || []).length} questions
                                </span>
                            </div>

                            <div className="p-4 space-y-3">
                                {group.imageUrl && (
                                    <div className="w-full">
                                        <img
                                            src={group.imageUrl}
                                            alt=""
                                            className="max-h-72 mx-auto object-contain rounded"
                                        />
                                    </div>
                                )}
                                {group.passage && (
                                    <div className="text-sm bg-white p-3 rounded border">
                                        {parse(group.passage)}
                                    </div>
                                )}

                                <div className="mt-1 grid grid-cols-1 gap-2">
                                    {group.questions?.map((q) => (
                                        <div
                                            key={q.id}
                                            className="rounded border bg-white px-3 py-2 flex items-center gap-2 text-sm"
                                        >
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold shrink-0">
                                                {q.position}
                                            </span>
                                            <span className="text-gray-600">
                                                Question {q.position != null ? `#${q.position}` : ""}
                                                {q.id != null ? (
                                                    <span className="text-gray-400 text-xs ml-2">id {q.id}</span>
                                                ) : null}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WritingPartDetail;
