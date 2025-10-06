import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTestById } from "@/api/api";
import SummaryHeader from "@/components/admin/test-detail/SummaryHeader";
import PartsTabs from "@/components/admin/test-detail/PartsTabs";
import PartDetail from "@/components/admin/test-detail/PartDetail";
import EditTestModal from "@/components/admin/test-detail/EditTestModal";

const TestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [test, setTest] = useState(null);
    const [selectedPartIndex, setSelectedPartIndex] = useState(0);
    const [openEdit, setOpenEdit] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchDetail = async () => {
            setIsLoading(true);
            setError("");
            try {
                const res = await getTestById(id);
                if (!isMounted) return;
                setTest(res?.data ?? null);
                setSelectedPartIndex(0);
            } catch (e) {
                if (!isMounted) return;
                setError(e?.message || "Không thể tải dữ liệu");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        if (id) fetchDetail();
        return () => { isMounted = false; };
    }, [id]);

    const selectedPart = useMemo(() => {
        if (!test?.partResponses || test.partResponses.length === 0) return null;
        const index = Math.min(Math.max(selectedPartIndex, 0), test.partResponses.length - 1);
        return test.partResponses[index];
    }, [test, selectedPartIndex]);

    if (isLoading) {
        return (
            <div className="p-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="text-red-600 mb-3">{error}</div>
                <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => navigate(-1)}>Quay lại</button>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="p-4">Không có dữ liệu</div>
        );
    }

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <SummaryHeader
                test={test}
                onEdit={() => setOpenEdit(true)}
            />
            <PartsTabs
                parts={test.partResponses}
                selectedIndex={selectedPartIndex}
                onSelect={setSelectedPartIndex}
            />
            <PartDetail part={selectedPart} />
            <EditTestModal
                open={openEdit}
                onClose={() => setOpenEdit(false)}
                test={test}
                onSuccess={() => {
                    // Reload detail after update
                    window.location.reload();
                }}
            />
        </div>
    );
};

export default TestDetailPage;