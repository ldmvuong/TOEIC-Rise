import dayjs from "dayjs";
import { EditOutlined, SwapOutlined } from "@ant-design/icons";
import { useAppSelector } from "@/redux/hooks";

const SummaryHeader = ({ test, onEditName, onChangeStatus }) => {
    const user = useAppSelector((state) => state.account.user);
    const isAdmin = user?.role === "ADMIN";

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
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-semibold tracking-tight">{test.name}</h1>
                        <button
                            onClick={onEditName}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Đổi tên"
                        >
                            <EditOutlined className="text-sm" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>ID: {test.id}</span>
                        <span className="w-px h-4 bg-gray-200" />
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs rounded border ${statusClass}`}>{test.status}</span>
                            {isAdmin && (
                                <button
                                    onClick={onChangeStatus}
                                    className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition"
                                    title="Đổi trạng thái"
                                >
                                    <SwapOutlined className="text-xs" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: timestamps right-aligned */}
                <div className="md:col-span-4">
                    <div className="flex items-center justify-end">
                        <div className="text-sm text-gray-600 leading-tight text-right">
                            <div>Tạo: {test.createdAt ? dayjs(test.createdAt).format('DD-MM-YYYY HH:mm:ss') : '-'}</div>
                            <div>Cập nhật: {test.updatedAt ? dayjs(test.updatedAt).format('DD-MM-YYYY HH:mm:ss') : '-'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryHeader;


