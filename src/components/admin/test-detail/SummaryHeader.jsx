import dayjs from "dayjs";
import { EditOutlined } from "@ant-design/icons";

const SummaryHeader = ({ test, onEdit }) => {
    if (!test) return null;

    const statusClass = (() => {
        switch (test.status) {
            case 'APPROVED':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'PENDING':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'REJECTED':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    })();

    return (
        <div className="bg-white shadow rounded p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Left: Title on top, ID | Status below */}
                <div className="md:col-span-8">
                    <h1 className="text-2xl font-semibold tracking-tight mb-1">{test.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>ID: {test.id}</span>
                        <span className="w-px h-4 bg-gray-200" />
                        <span className={`px-2 py-0.5 text-xs rounded border ${statusClass}`}>{test.status}</span>
                    </div>
                </div>

                {/* Right: action centered + timestamps right-aligned */}
                <div className="md:col-span-4">
                    <div className="flex items-center justify-end gap-4">
                        <div className="text-sm text-gray-600 leading-tight text-right">
                            <div>Tạo: {test.createdAt ? dayjs(test.createdAt).format('DD-MM-YYYY HH:mm:ss') : '-'}</div>
                            <div>Cập nhật: {test.updatedAt ? dayjs(test.updatedAt).format('DD-MM-YYYY HH:mm:ss') : '-'}</div>
                        </div>
                        <span className="hidden md:block w-px h-10 bg-gray-200" />
                        <button
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 active:bg-blue-100 transition"
                            onClick={onEdit}
                            title="Chỉnh sửa"
                        >
                            <EditOutlined />
                            <span className="text-sm">Chỉnh sửa</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryHeader;


