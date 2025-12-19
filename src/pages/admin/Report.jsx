import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import DataTable from "@/components/admin/data-table";
import { Tag, Tooltip, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { ProFormSelect } from "@ant-design/pro-components";
import queryString from "query-string";
import { getAllReport, getAllReportByStaff } from "@/api/api";

const ReportPage = () => {
  const location = useLocation();
  const tableRef = useRef();
  const formRef = useRef();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.account.user);
  const isAdmin = user?.role === "ADMIN";

  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [meta, setMeta] = React.useState({ page: 0, pageSize: 10, total: 0 });
  const [initialParams, setInitialParams] = useState({});

  const reasonLabels = {
    WRONG_ANSWER: "Wrong answer",
    TYPO: "Typo",
    WRONG_EXPLANATION: "Wrong explanation",
    INCORRECT_CONTENT: "Incorrect content",
    MISSING_MEDIA: "Missing media",
    OFFENSIVE_CONTENT: "Offensive content",
    OTHER: "Other reason",
  };

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 60,
      align: "center",
      render: (text, record, index) => <>{index + 1 + meta.page * meta.pageSize}</>,
      hideInSearch: true,
    },
    {
      title: "Test Name",
      dataIndex: "testName",
      width: 200,
      hideInSearch: true,
    },
    {
      title: "Reporter",
      dataIndex: "reporterName",
      width: 200,
      hideInSearch: true,
    },
    {
      title: "Handler",
      key: "resolverName",
      width: 200,
      render: (text, record) => {
        const resolverName = record?.resolverName;
        if (resolverName != null && String(resolverName).trim() !== "") {
          return <span style={{ color: "#374151" }}>{resolverName}</span>;
        }
        return <Tag color="default">Unhandled</Tag>;
      },
      hideInSearch: true,
    },
    {
      title: "Reason",
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
      title: "Status",
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
            placeholder="Select status"
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
    {
      title: "Action",
      key: "actions",
      width: 120,
      hideInSearch: true,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/admin/reports/${record.id || record.questionReportId}`)}
        >
          View
        </Button>
      ),
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

  // Read query params from URL and set initial form values
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    
    if (status && isAdmin) {
      const params = { status: status };
      setInitialParams(params);
      
      // Set form values using formRef
      if (formRef.current) {
        setTimeout(() => {
          formRef.current.setFieldsValue(params);
          // Trigger table reload with the status filter
          if (tableRef.current) {
            tableRef.current.reload();
          }
        }, 100);
      }
    } else {
      setInitialParams({});
      if (formRef.current) {
        formRef.current.resetFields();
      }
    }
  }, [location.search, isAdmin]);

  return (
    <div>
      <DataTable
        actionRef={tableRef}
        formRef={formRef}
        headerTitle="Report Management"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={reports}
        params={initialParams}
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
          showTotal: (total, range) => <div>{range[0]}-{range[1]} of {total} rows</div>,
        }}
        scroll={{ x: true }}
        rowSelection={false}
      />
    </div>
  );
};

export default ReportPage;

