import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Select, Spin } from "antd";
import { getAllTags } from "@/api/api";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

function normalizeTagList(body) {
  const raw =
    body?.result ??
    body?.items ??
    body?.content ??
    body?.data ??
    [];
  return Array.isArray(raw) ? raw : [];
}

function metaPages(body) {
  const meta = body?.meta ?? {};
  if (typeof meta.pages === "number") return meta.pages;
  if (typeof meta.totalPages === "number") return meta.totalPages;
  const total = meta.total ?? meta.totalElements;
  const size = meta.pageSize ?? meta.size ?? PAGE_SIZE;
  if (typeof total === "number" && size > 0) {
    return Math.ceil(total / size);
  }
  return null;
}

/**
 * Select tag từ GET /staff/tags (page, size, tagName).
 * — Mở dropdown: load page 0, size PAGE_SIZE (thay thế danh sách).
 * — Xem thêm: page++, cộng dồn.
 * — Gõ ô tìm: debounce DEBOUNCE_MS, tagName, page 0 (thay thế).
 *
 * Giá trị Select (value / onChange) là **tag name** (string),
 * để backend có thể nhận trực tiếp vào trường `practice`.
 *
 * @param {object} props
 * @param {string | null | undefined} props.value Tag name đã chọn
 * @param {(name: string | null) => void} props.onChange
 */
export default function StaffTagPaginatedSelect({
  value,
  onChange,
  placeholder = "Chọn tag bài tập",
  disabled = false,
  allowClear = true,
  pageSize = PAGE_SIZE,
  className,
}) {
  const [open, setOpen] = useState(false);
  /** Nội dung ô search (controlled, gõ liên tục) */
  const [searchDraft, setSearchDraft] = useState("");
  /** Đã debounce — dùng cho API */
  const [searchApplied, setSearchApplied] = useState("");

  const [tags, setTags] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  /** Chống race khi đổi ô search / đóng dropdown */
  const requestIdRef = useRef(0);

  /** Debounce: nhập ô search → chờ DEBOUNCE_MS rồi cập nhật searchApplied */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchApplied(searchDraft.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const fetchSlice = useCallback(
    async (requestedPage, { append }) => {
      const rid = ++requestIdRef.current;

      const params = new URLSearchParams({
        page: String(requestedPage),
        size: String(pageSize),
      });
      if (searchApplied) {
        params.set("tagName", searchApplied);
      }

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoadingInitial(true);
        }

        const res = await getAllTags(params.toString());
        if (rid !== requestIdRef.current) {
          return;
        }

        const body = res?.data ?? {};
        const chunk = normalizeTagList(body)
          .map((t) => {
            const id = t?.id ?? t?.tagId ?? t?.uuid;
            const label =
              (t?.name ?? t?.tagName ?? "").trim() ||
              (id != null ? `Tag #${id}` : "");
            return id != null && label ? { id, name: label } : null;
          })
          .filter(Boolean);

        const totalPageCount = metaPages(body);
        let nextHasMore;
        if (totalPageCount != null && totalPageCount >= 1) {
          nextHasMore = requestedPage + 1 < totalPageCount;
        } else {
          nextHasMore = chunk.length >= pageSize;
        }

        setHasMore(nextHasMore);
        setPage(requestedPage);

        if (!append) {
          setTags(chunk);
        } else {
          setTags((prev) => {
            const map = new Map(
              prev.map((x) => [x.name, x]),
            );
            for (const item of chunk) {
              map.set(item.name, item);
            }
            return [...map.values()];
          });
        }
      } catch {
        if (rid === requestIdRef.current) {
          if (!append) {
            setTags([]);
          }
          setHasMore(false);
        }
      } finally {
        if (rid === requestIdRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
        }
      }
    },
    [pageSize, searchApplied],
  );

  /** Mở dropdown hoặc searchApplied đổi (đúng debounce): load trang đầu, thay danh sách */
  useEffect(() => {
    if (!open) {
      return;
    }
    setTags([]);
    setPage(0);
    setHasMore(false);
    fetchSlice(0, { append: false });
  }, [open, searchApplied, fetchSlice]);

  const loadMore = useCallback(() => {
    if (!open || loadingMore || loadingInitial || !hasMore) {
      return;
    }
    fetchSlice(page + 1, { append: true });
  }, [open, loadingMore, loadingInitial, hasMore, page, fetchSlice]);

  const selectedSnap = tags.find((t) => t.name === value);

  const options = useMemo(() => {
    const base = tags.map((t) => ({
      value: t.name,
      label: t.name,
    }));
    if (
      value != null &&
      !base.some((o) => o.value === value)
    ) {
      return [
        {
          value,
          label: selectedSnap?.name || String(value),
        },
        ...base,
      ];
    }
    return base;
  }, [tags, value, selectedSnap]);

  /** Khi không mở dropdown, ô search trong Select không cần giữ keyword cũ */
  const handleOpenChange = useCallback((nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchDraft("");
      setSearchApplied("");
      requestIdRef.current += 1;
    }
  }, []);

  return (
    <Select
      className={`min-w-[200px] ${className || ""}`}
      allowClear={allowClear}
      disabled={disabled}
      placeholder={placeholder}
      value={value ?? undefined}
      options={options}
      showSearch
      filterOption={false}
      loading={loadingInitial && tags.length === 0 && open}
      searchValue={open ? searchDraft : undefined}
      onSearch={(q) => {
        setSearchDraft(q);
      }}
      onChange={(v) => {
        onChange?.(v ?? null);
      }}
      open={open}
      onOpenChange={handleOpenChange}
      popupMatchSelectWidth
      styles={{ popup: { root: { padding: 0 } } }}
      popupRender={(menu) => (
        <div className="staff-tag-dropdown overflow-hidden rounded-lg border border-slate-100 bg-white shadow-lg">
          {loadingInitial && tags.length === 0 ? (
            <div className="flex justify-center py-10">
              <Spin tip="Đang tải…" />
            </div>
          ) : (
            <>
              <div className="max-h-[280px] overflow-y-auto">{menu}</div>
              <div className="border-t border-slate-100 bg-slate-50/90 px-1 py-1">
                {loadingMore ? (
                  <div className="flex justify-center py-2">
                    <Spin size="small" />
                  </div>
                ) : hasMore ? (
                  <Button
                    type="text"
                    block
                    className="text-indigo-600 hover:!bg-indigo-50"
                    // Giữ dropdown mở khi nhấn
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => loadMore()}
                  >
                    Xem thêm
                  </Button>
                ) : tags.length > 0 ? (
                  <div className="py-2 text-center text-xs text-slate-400">
                    Đã hết danh sách
                  </div>
                ) : (
                  <div className="py-6 px-4 text-center text-xs text-slate-500">
                    {searchApplied
                      ? "Không tìm thấy tag phù hợp."
                      : "Chưa có tag."}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      notFoundContent={
        loadingInitial ? (
          <div className="py-6 text-center">
            <Spin size="small" />
          </div>
        ) : null
      }
    />
  );
}

