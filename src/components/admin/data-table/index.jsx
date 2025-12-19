import { ProTable } from '@ant-design/pro-components';
import en_US from 'antd/locale/en_US';
import { ConfigProvider } from 'antd';

const DataTable = (props) => {
  const {
    columns,
    defaultData = [],
    dataSource,
    postData,
    pagination,
    loading,
    rowKey = (record) => record.id,
    scroll,
    params,
    request,
    search,
    polling,
    toolBarRender,
    headerTitle,
    actionRef,
    dateFormatter = 'string',
    rowSelection,
    formRef,
  } = props;

  return (
    <ConfigProvider locale={en_US}>
      <ProTable
        columns={columns}
        defaultData={defaultData}
        dataSource={dataSource}
        postData={postData}
        pagination={pagination}
        bordered
        loading={loading}
        rowKey={rowKey}
        scroll={scroll}
        params={params}
        request={request}
        search={search}
        polling={polling}
        toolBarRender={toolBarRender}
        headerTitle={headerTitle}
        actionRef={actionRef}
        formRef={formRef}
        dateFormatter={dateFormatter}
        rowSelection={rowSelection}
      />
    </ConfigProvider>
  );
};

export default DataTable;
