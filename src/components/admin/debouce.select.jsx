import React, { useMemo, useRef, useState } from 'react';
import { Select, Spin } from 'antd';
import debounce from 'lodash/debounce';

const DebounceSelect = ({ fetchOptions, debounceTimeout = 800, value, paged = false, pageSize = 10, ...props }) => {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState([]);
  const fetchRef = useRef(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const searchValueRef = useRef('');

  const debounceFetcher = useMemo(() => {
    const loadOptions = (value) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setOptions([]);
      setFetching(true);
      setPage(0);
      setHasMore(true);
      searchValueRef.current = value || '';

      const maybePromise = paged
        ? fetchOptions(value, 0, pageSize)
        : fetchOptions(value);

      Promise.resolve(maybePromise).then((result) => {
        if (fetchId !== fetchRef.current) {
          return;
        }
        const newOptions = Array.isArray(result?.options) ? result.options : result;
        const more = paged ? !!result?.hasMore : false;
        setOptions(newOptions);
        setHasMore(more);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [fetchOptions, debounceTimeout, paged, pageSize]);

  const handleOnFocus = () => {
    if (options && options.length > 0) {
      return;
    }
    const maybePromise = paged
      ? fetchOptions('', 0, pageSize)
      : fetchOptions('');
    Promise.resolve(maybePromise).then((result) => {
      const initOptions = Array.isArray(result?.options) ? result.options : result;
      const more = paged ? !!result?.hasMore : false;
      setOptions([...(options || []), ...initOptions]);
      setHasMore(more);
    });
  };

  const handleOnBlur = () => {
    setOptions([]);
    setPage(0);
    setHasMore(true);
    searchValueRef.current = '';
  };

  const handlePopupScroll = (e) => {
    if (!paged || fetching || !hasMore) return;
    const target = e.target;
    const threshold = 60; // px to bottom
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - threshold) {
      // Load next page
      const nextPage = page + 1;
      setFetching(true);
      const maybePromise = fetchOptions(searchValueRef.current, nextPage, pageSize);
      Promise.resolve(maybePromise).then((result) => {
        const newOptions = Array.isArray(result?.options) ? result.options : result;
        const more = paged ? !!result?.hasMore : false;
        setOptions((prev) => [...prev, ...newOptions]);
        setHasMore(more);
        setPage(nextPage);
        setFetching(false);
      });
    }
  };

  return (
    <Select
      labelInValue
      filterOption={false}
      onSearch={debounceFetcher}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      {...props}
      options={options}
      onFocus={handleOnFocus}
      onBlur={handleOnBlur}
      onPopupScroll={handlePopupScroll}
    />
  );
};

export default DebounceSelect;
