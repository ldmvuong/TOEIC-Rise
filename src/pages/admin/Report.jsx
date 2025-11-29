import React, { useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import DataTable from "@/components/admin/data-table";
import { Tag, Tooltip } from "antd";
import { ProFormSelect } from "@ant-design/pro-components";
import queryString from "query-string";
import { getAllReport, getAllReportByStaff } from "@/api/api";

const ReportPage = () => {
  const tableRef = useRef();
  const user = useAppSelector((state) => state.account.user);
  const isAdmin = user?.role === "ADMIN";

  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [meta, setMeta] = React.useState({ page: 0, pageSize: 10, total: 0 });

  const reasonLabels = {
    WRONG_ANSWER: "Đáp án sai",
    TYPO: "Lỗi chính tả",
    WRONG_EXPLANATION: "Giải thích sai",
    INCORRECT_CONTENT: "Nội dung không chính xác",
    MISSING_MEDIA: "Thiếu file đính kèm",
    OFFENSIVE_CONTENT: "Nội dung phản cảm",
    OTHER: "Lý do khác",
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (text, record, index) => <>{index + 1 + meta.page * meta.pageSize}</>,
      hideInSearch: true,
    },
    {
      title: "Tên Test",
      dataIndex: "testName",
      width: 200,
      hideInSearch: true,
    },
    {
      title: "Người báo cáo",
      dataIndex: "reporterName",
      width: 200,
      hideInSearch: true,
    },
    {
      title: "Người xử lý",
      key: "resolverName",
      width: 200,
      render: (text, record) => {
        const resolverName = record?.resolverName;
        if (resolverName != null && String(resolverName).trim() !== "") {
          return <span style={{ color: "#374151" }}>{resolverName}</span>;
        }
        return <Tag color="default">Chưa xử lý</Tag>;
      },
      hideInSearch: true,
    },
    {
      title: "Lý do",
      dataIndex: "reasons",
      width: 300,
      render: (reasons) => {
        if (!reasons || !Array.isArray(reasons) || reasons.length === 0) return "-";
        
        const maxVisible = 2;
        const visibleReasons = reasons.slice(0, maxVisible);
        const remainingCount = reasons.length - maxVisible;
        const allLabels = reasons.map((r) => reasonLabels[r] || r).join(", ");

        return (
          <Tooltip title={allLabels} placement="top">
            <div className="flex flex-wrap gap-1">
              {visibleReasons.map((reason, idx) => (
                <Tag key={idx} color="blue">
                  {reasonLabels[reason] || reason}
                </Tag>
              ))}
              {remainingCount > 0 && (
                <Tag color="default">+{remainingCount}</Tag>
              )}
            </div>
          </Tooltip>
        );
      },
      hideInSearch: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 140,
      renderFormItem: () =>
        isAdmin ? (
          <ProFormSelect
            showSearch
            mode="single"
            allowClear
            valueEnum={{
              PENDING: "PENDING",
              REVIEWING: "REVIEWING",
              RESOLVED: "RESOLVED",
              REJECTED: "REJECTED",
            }}
            placeholder="Chọn trạng thái"
          />
        ) : null,
      render: (val) => {
        const colorMap = {
          PENDING: "orange",
          REVIEWING: "blue",
          RESOLVED: "green",
          REJECTED: "red",
        };
        return <Tag color={colorMap[val] || "default"}>{val}</Tag>;
      },
    },
  ];

  const buildQuery = (params, sort) => {
    const clone = { ...params };
    const q = {
      page: clone.current - 1,
      size: clone.pageSize,
    };

    // Chỉ ADMIN mới có filter status
    if (isAdmin && clone.status) {
      q.questionReportStatus = clone.status;
    }

    return queryString.stringify(q);
  };

  return (
    <div>
      <DataTable
        actionRef={tableRef}
        headerTitle="Quản lý Báo cáo"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={reports}
        request={async (params, sort) => {
          setLoading(true);
          try {
            const query = buildQuery(params, sort);
            const response = isAdmin ? await getAllReport(query) : await getAllReportByStaff(query);
            const data = response?.data || {};
            setReports(data.result || []);
            setMeta({
              page: data.meta?.page || 0,
              pageSize: data.meta?.pageSize || 10,
              total: data.meta?.total || 0,
            });
          } catch (error) {
            console.error("Failed to fetch reports", error);
            setReports([]);
            setMeta({ page: 0, pageSize: 10, total: 0 });
          } finally {
            setLoading(false);
          }
        }}
        pagination={{
          current: meta.page + 1,
          pageSize: meta.pageSize,
          total: meta.total,
          showSizeChanger: true,
          showTotal: (total, range) => <div>{range[0]}-{range[1]} trên {total} rows</div>,
        }}
        scroll={{ x: true }}
        rowSelection={false}
      />
    </div>
  );
};

export default ReportPage;

