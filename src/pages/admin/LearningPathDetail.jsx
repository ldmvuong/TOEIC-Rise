import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CaretDownOutlined,
  CaretUpOutlined,
  EditOutlined,
  EyeOutlined,
  HolderOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getAdminLearningPathDetailBySlug,
  reorderLearningPathLessons,
  setAdminLessonActive,
} from "@/api/api";

const { Title, Text } = Typography;

const LEVEL_OPTIONS = [
  { label: "BEGINNER", value: "BEGINNER" },
  { label: "INTERMEDIATE", value: "INTERMEDIATE" },
  { label: "ADVANCED", value: "ADVANCED" },
];

const SORT_FIELD_MAP = {
  orderIndex: "orderIndex",
  title: "title",
  topic: "topic",
};

function normalizeDirection(dir) {
  const raw = String(dir || "").toUpperCase();
  return raw === "ASC" ? "ASC" : "DESC";
}

function DataTableSortIcon({ sortOrder }) {
  const inactive = "rgba(0,0,0,0.25)";
  const active = "#1890ff";
  const upColor = sortOrder === "ascend" ? active : inactive;
  const downColor = sortOrder === "descend" ? active : inactive;
  return (
    <span className="ml-2 inline-flex flex-col leading-none" aria-hidden>
      <CaretUpOutlined style={{ fontSize: 10, color: upColor }} />
      <CaretDownOutlined
        style={{ marginTop: -3, fontSize: 10, color: downColor }}
      />
    </span>
  );
}

function toPaginationFromLessons(
  lessons,
  fallback = { page: 0, size: 10, total: 0 },
) {
  if (Array.isArray(lessons)) {
    return { ...fallback, total: lessons.length };
  }
  if (lessons && typeof lessons === "object") {
    if (lessons.meta && typeof lessons.meta === "object") {
      const page = lessons.meta.page ?? fallback.page ?? 0;
      const size = lessons.meta.pageSize ?? fallback.size ?? 10;
      const total =
        lessons.meta.total ??
        (Array.isArray(lessons.result) ? lessons.result.length : 0);
      return {
        page: Number(page) || 0,
        size: Number(size) || 10,
        total: Number(total) || 0,
      };
    }

    const total =
      lessons.totalElements ??
      lessons.total ??
      lessons.totalCount ??
      (Array.isArray(lessons.content) ? lessons.content.length : 0);
    const page = lessons.number ?? lessons.page ?? fallback.page ?? 0;
    const size = lessons.size ?? fallback.size ?? 10;
    return {
      page: Number(page) || 0,
      size: Number(size) || 10,
      total: Number(total) || 0,
    };
  }
  return fallback;
}

function toLessonRows(lessons) {
  if (Array.isArray(lessons)) return lessons;
  if (lessons && typeof lessons === "object" && Array.isArray(lessons.result))
    return lessons.result;
  if (lessons && typeof lessons === "object" && Array.isArray(lessons.content))
    return lessons.content;
  return [];
}

function TopicTag({ value }) {
  const raw = (value ?? "").toString();
  const norm = raw.toLowerCase();
  const isGrammar =
    norm.includes("grammar") ||
    norm.includes("ngữ pháp") ||
    norm.includes("ngu phap");
  const isVocab =
    norm.includes("vocab") ||
    norm.includes("vocabulary") ||
    norm.includes("từ vựng") ||
    norm.includes("tu vung");
  const color = isGrammar ? "purple" : isVocab ? "blue" : "default";
  return (
    <Tag color={color} style={{ marginInlineEnd: 0 }}>
      {raw || "—"}
    </Tag>
  );
}

function LevelTag({ value }) {
  const raw = (value ?? "").toString();
  const norm = raw.toUpperCase();
  const color =
    norm === "BEGINNER"
      ? "green"
      : norm === "INTERMEDIATE"
        ? "gold"
        : norm === "ADVANCED"
          ? "red"
          : "default";
  return (
    <Tag color={color} style={{ marginInlineEnd: 0 }}>
      {raw || "—"}
    </Tag>
  );
}

const RowDragContext = createContext(null);

function DragHandle() {
  const ctx = useContext(RowDragContext);
  if (!ctx) return null;
  return (
    <span
      ref={ctx.setActivatorNodeRef}
      {...ctx.listeners}
      className="inline-flex items-center justify-center text-slate-500 hover:text-slate-700"
      style={{ cursor: "grab", touchAction: "none" }}
      aria-label="Drag to reorder"
    >
      <HolderOutlined />
    </span>
  );
}

function SortableRow(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props["data-row-key"] });

  const style = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging
      ? {
          background: "rgba(59, 130, 246, 0.06)",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)",
        }
      : null),
  };

  return (
    <RowDragContext.Provider value={{ listeners, setActivatorNodeRef }}>
      <tr ref={setNodeRef} style={style} {...props} {...attributes} />
    </RowDragContext.Provider>
  );
}

export default function AdminLearningPathDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const learningPathSlug = useMemo(() => slug, [slug]);

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const learningPathId = detail?.id;
  const [updatingIds, setUpdatingIds] = useState(() => new Set());
  const [reordering, setReordering] = useState(false);
  const [query, setQuery] = useState(() => ({
    name: "",
    level: undefined,
    page: 0,
    size: 10,
    sortBy: "orderIndex",
    direction: "ASC",
  }));

  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const lastRequestedRef = useRef(null);

  const nameDebounceRef = useRef(null);
  useEffect(() => {
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, []);

  const load = useCallback(
    async (next = {}) => {
      if (!learningPathSlug) return;
      const current = queryRef.current;
      const merged = { ...current, ...next };
      merged.direction = normalizeDirection(merged.direction);
      if (merged.page == null || Number.isNaN(Number(merged.page)))
        merged.page = 0;
      if (merged.size == null || Number.isNaN(Number(merged.size)))
        merged.size = 10;

      const last = lastRequestedRef.current;
      const unchangedSinceLastRequest =
        last &&
        String(last?.name ?? "") === String(merged?.name ?? "") &&
        String(last?.level ?? "") === String(merged?.level ?? "") &&
        Number(last?.page ?? 0) === Number(merged?.page ?? 0) &&
        Number(last?.size ?? 10) === Number(merged?.size ?? 10) &&
        String(last?.sortBy ?? "") === String(merged?.sortBy ?? "") &&
        normalizeDirection(last?.direction) ===
          normalizeDirection(merged?.direction);
      if (unchangedSinceLastRequest && detail != null) return;

      setLoading(true);
      try {
        const res = await getAdminLearningPathDetailBySlug(learningPathSlug, {
          name: merged.name || undefined,
          level: merged.level || undefined,
          page: merged.page ?? 0,
          size: merged.size ?? 10,
          sortBy: merged.sortBy ?? "orderIndex",
          direction: merged.direction ?? "ASC",
        });
        setDetail(res?.data ?? null);
        lastRequestedRef.current = merged;
        setQuery((prev) => {
          const prevNorm = {
            ...prev,
            direction: normalizeDirection(prev?.direction),
          };
          const nextNorm = {
            ...merged,
            direction: normalizeDirection(merged?.direction),
          };
          const same =
            String(prevNorm?.name ?? "") === String(nextNorm?.name ?? "") &&
            String(prevNorm?.level ?? "") === String(nextNorm?.level ?? "") &&
            Number(prevNorm?.page ?? 0) === Number(nextNorm?.page ?? 0) &&
            Number(prevNorm?.size ?? 10) === Number(nextNorm?.size ?? 10) &&
            String(prevNorm?.sortBy ?? "") === String(nextNorm?.sortBy ?? "") &&
            String(prevNorm?.direction ?? "ASC") ===
              String(nextNorm?.direction ?? "ASC");
          return same ? prev : nextNorm;
        });
      } catch (e) {
        message.error(
          e?.response?.data?.message || e?.message || "Failed to load detail",
        );
      } finally {
        setLoading(false);
      }
    },
    [detail, learningPathSlug],
  );

  useEffect(() => {
    load();
  }, [learningPathSlug]);

  const toggleLessonActive = useCallback(async (row, nextActive) => {
    if (!row?.id) return;

    const ok = await new Promise((resolve) => {
      Modal.confirm({
        title: "Confirm status change",
        content: `Set lesson #${row.id} to ${nextActive ? "Active" : "Inactive"}?`,
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!ok) return;

    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(row.id);
      return next;
    });

    // optimistic UI update
    setDetail((prev) => {
      if (!prev || !Array.isArray(prev.lessons)) return prev;
      return {
        ...prev,
        lessons: prev.lessons.map((l) =>
          String(l.id) === String(row.id) ? { ...l, isActive: nextActive } : l,
        ),
      };
    });

    try {
      await setAdminLessonActive(row.id, nextActive);
      message.success("Updated lesson status");
    } catch (e) {
      // revert on failure
      setDetail((prev) => {
        if (!prev || !Array.isArray(prev.lessons)) return prev;
        return {
          ...prev,
          lessons: prev.lessons.map((l) =>
            String(l.id) === String(row.id)
              ? { ...l, isActive: row.isActive }
              : l,
          ),
        };
      });
      message.error(
        e?.response?.data?.message || e?.message || "Update failed",
      );
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const onDragEnd = useCallback(
    async ({ active, over }) => {
      if (!over || !active?.id || active.id === over.id) return;
      if (!learningPathId) return;
      if (query.name || query.level || query.sortBy !== "orderIndex") {
        message.info(
          "Reorder chỉ khả dụng khi không filter và đang sort theo Index",
        );
        return;
      }
      if (!Array.isArray(detail?.lessons)) return;

      const prevLessons = detail.lessons;
      const oldIndex = prevLessons.findIndex(
        (i) => String(i.id) === String(active.id),
      );
      const newIndex = prevLessons.findIndex(
        (i) => String(i.id) === String(over.id),
      );
      if (oldIndex < 0 || newIndex < 0) return;

      const nextLessons = arrayMove(prevLessons, oldIndex, newIndex).map(
        (l, idx) => ({
          ...l,
          orderIndex: idx + 1,
        }),
      );

      const oldIndexMap = new Map(
        prevLessons.map((l, idx) => [String(l.id), idx]),
      );
      const changed = nextLessons
        .map((l, idx) => ({
          lessonId: Number(l.id),
          orderIndex: idx + 1,
          _changed: oldIndexMap.get(String(l.id)) !== idx,
        }))
        .filter((x) => x._changed)
        .map(({ lessonId, orderIndex }) => ({ lessonId, orderIndex }));

      // optimistic UI
      setDetail((prev) => (prev ? { ...prev, lessons: nextLessons } : prev));

      if (changed.length === 0) return;

      try {
        setReordering(true);
        await reorderLearningPathLessons(Number(learningPathId), {
          items: changed,
        });
        message.success("Reordered lessons");
      } catch (e) {
        setDetail((prev) => (prev ? { ...prev, lessons: prevLessons } : prev));
        message.error(
          e?.response?.data?.message || e?.message || "Reorder failed",
        );
      } finally {
        setReordering(false);
      }
    },
    [detail?.lessons, learningPathId, query.level, query.name, query.sortBy],
  );

  const columns = useMemo(
    () => [
      {
        title: "",
        key: "__drag",
        width: 44,
        align: "center",
        render: () => <DragHandle />,
      },
      {
        title: "Index",
        dataIndex: "orderIndex",
        key: "orderIndex",
        width: 90,
        align: "center",
        sorter: true,
        sortOrder:
          query.sortBy === "orderIndex"
            ? query.direction === "ASC"
              ? "ascend"
              : "descend"
            : null,
        render: (v) => (
          <span style={{ whiteSpace: "nowrap" }}>
            {v == null ? "—" : String(v)}
          </span>
        ),
      },
      {
        title: "Title",
        dataIndex: "title",
        key: "title",
        ellipsis: true,
        sorter: true,
        sortOrder:
          query.sortBy === "title"
            ? query.direction === "ASC"
              ? "ascend"
              : "descend"
            : null,
      },
      {
        title: "Topic",
        dataIndex: "topic",
        key: "topic",
        width: 140,
        align: "center",
        sorter: true,
        sortOrder:
          query.sortBy === "topic"
            ? query.direction === "ASC"
              ? "ascend"
              : "descend"
            : null,
        render: (v) => <TopicTag value={v} />,
      },
      {
        title: "Level",
        dataIndex: "level",
        key: "level",
        width: 140,
        align: "center",
        render: (v) => <LevelTag value={v} />,
      },
      {
        title: "Active",
        dataIndex: "isActive",
        key: "isActive",
        width: 110,
        align: "center",
        render: (v, row) => (
          <Switch
            checked={Boolean(v)}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            loading={updatingIds.has(row.id)}
            onChange={(checked) => toggleLessonActive(row, checked)}
          />
        ),
      },
      {
        title: "",
        key: "actions",
        width: 110,
        align: "center",
        render: (_, row) => (
          <Space size={2}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                if (!learningPathId || !row?.id) return;
                navigate(
                  `/admin/learning-paths/${learningPathId}/lessons/${row.id}`,
                  {
                    state: {
                      referrer: `/admin/learning-paths/${learningPathSlug}`,
                    },
                  },
                );
              }}
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() =>
                navigate(
                  `/admin/learning-paths/${learningPathId}/lessons/${row.id}/edit`,
                )
              }
            />
          </Space>
        ),
      },
    ],
    [
      learningPathId,
      learningPathSlug,
      navigate,
      query.direction,
      query.sortBy,
      toggleLessonActive,
      updatingIds,
    ],
  );

  const lessonRows = useMemo(
    () => toLessonRows(detail?.lessons),
    [detail?.lessons],
  );
  const totalLessons = useMemo(
    () => toPaginationFromLessons(detail?.lessons, { total: 0 }).total,
    [detail?.lessons],
  );

  const pagination = useMemo(() => {
    const p = toPaginationFromLessons(detail?.lessons, {
      page: query.page ?? 0,
      size: query.size ?? 10,
      total: lessonRows.length,
    });
    return {
      total: p.total,
      current: (query.page ?? p.page ?? 0) + 1,
      pageSize: query.size ?? p.size ?? 10,
      showSizeChanger: true,
      showTotal: (t, range) => (
        <div>
          {range[0]}-{range[1]} of {t} rows
        </div>
      ),
    };
  }, [detail?.lessons, lessonRows.length, query.page, query.size]);

  const lessonIds = useMemo(
    () => (Array.isArray(lessonRows) ? lessonRows.map((l) => l.id) : []),
    [lessonRows],
  );

  return (
    <div style={{ padding: 16 }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/learning-paths"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Learning Paths
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <Title level={4} style={{ margin: 0 }}>
              {detail?.name || `Learning Path #${learningPathId}`}
            </Title>
            <Tag
              color={detail?.isActive ? "green" : "red"}
              style={{ marginInlineEnd: 0 }}
            >
              {detail?.isActive ? "Active" : "Inactive"}
            </Tag>
          </div>
          {detail?.description ? (
            <div className="mt-1 text-sm text-slate-700">
              {detail.description}
            </div>
          ) : null}
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              learningPathId &&
              navigate(`/admin/learning-paths/${learningPathId}/lessons/new`)
            }
          >
            Add lesson
          </Button>
        </Space>
      </div>

      <Card
        variant="outlined"
        style={{ borderRadius: 12 }}
        styles={{
          header: {
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            borderBottom: "1px solid #e2e8f0",
          },
          body: { paddingTop: 12 },
        }}
        title={
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-1 flex-wrap items-start gap-x-6 gap-y-3 min-w-[260px]">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-600 whitespace-nowrap">
                      Name:
                    </div>
                    <Input
                      allowClear
                      placeholder="Please enter"
                      value={query.name}
                      prefix={<SearchOutlined />}
                      style={{ width: 280, maxWidth: "100%" }}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === queryRef.current.name) return;
                        setQuery((prev) => ({ ...prev, name: next, page: 0 }));
                        if (nameDebounceRef.current)
                          clearTimeout(nameDebounceRef.current);
                        nameDebounceRef.current = setTimeout(() => {
                          load({ name: next || "", page: 0 });
                        }, 350);
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-600 whitespace-nowrap">
                      Level:
                    </div>
                    <Select
                      allowClear
                      placeholder="Filter level"
                      style={{ width: 220 }}
                      options={LEVEL_OPTIONS}
                      value={query.level}
                      onChange={(v) => {
                        const nextLevel = v || undefined;
                        if (nextLevel === queryRef.current.level) return;
                        setQuery((prev) => ({
                          ...prev,
                          level: nextLevel,
                          page: 0,
                        }));
                        load({ level: nextLevel, page: 0 });
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (nameDebounceRef.current)
                        clearTimeout(nameDebounceRef.current);
                      const cur = queryRef.current;
                      const alreadyDefault =
                        !cur.name &&
                        !cur.level &&
                        Number(cur.page ?? 0) === 0 &&
                        String(cur.sortBy ?? "") === "orderIndex" &&
                        normalizeDirection(cur.direction) === "ASC";
                      if (alreadyDefault) return;

                      setQuery((prev) => ({
                        ...prev,
                        name: "",
                        level: undefined,
                        page: 0,
                        sortBy: "orderIndex",
                        direction: "ASC",
                      }));

                      load({
                        name: "",
                        level: undefined,
                        page: 0,
                        size: query.size ?? 10,
                        sortBy: "orderIndex",
                        direction: "ASC",
                      });
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={lessonIds}
            strategy={verticalListSortingStrategy}
          >
            <Table
              rowKey={(row) => row.id}
              loading={loading || reordering}
              columns={columns}
              dataSource={lessonRows}
              pagination={pagination}
              onChange={(p, _filters, sorter, extra) => {
                const nextPage = (p?.current ?? 1) - 1;
                const nextSize = p?.pageSize ?? query.size ?? 10;

                let nextSortBy = query.sortBy ?? "orderIndex";
                let nextDirection = query.direction ?? "ASC";

                const s = Array.isArray(sorter) ? sorter[0] : sorter;
                if (s?.order) {
                  const key = s?.field || s?.columnKey;
                  if (key && SORT_FIELD_MAP[key]) {
                    nextSortBy = SORT_FIELD_MAP[key];
                    nextDirection = s.order === "ascend" ? "ASC" : "DESC";
                  }
                } else if (extra?.action === "sort") {
                  // AntD multi-state header sort: ascend -> descend -> cancel
                  // On cancel sort, behave like Tests/ProTable: return to baseline sort.
                  nextSortBy = "orderIndex";
                  nextDirection = "ASC";
                } else if (!extra?.action) {
                  // Fallback for environments where Table doesn't pass extra:
                  // only treat missing order as "cancel sort" when user isn't changing pagination.
                  const curPg = queryRef.current;
                  const pagingChanged =
                    Number(curPg?.page ?? 0) !== Number(nextPage) ||
                    Number(curPg?.size ?? 10) !== Number(nextSize);
                  if (!pagingChanged) {
                    nextSortBy = "orderIndex";
                    nextDirection = "ASC";
                  }
                }

                const cur = queryRef.current;
                const changed =
                  Number(cur?.page ?? 0) !== Number(nextPage) ||
                  Number(cur?.size ?? 10) !== Number(nextSize) ||
                  String(cur?.sortBy ?? "") !== String(nextSortBy) ||
                  normalizeDirection(cur?.direction) !==
                    normalizeDirection(nextDirection);
                if (!changed) return;

                load({
                  page: nextPage,
                  size: nextSize,
                  sortBy: nextSortBy,
                  direction: nextDirection,
                });
              }}
              scroll={{ x: true }}
              sortIcon={({ sortOrder }) => (
                <DataTableSortIcon sortOrder={sortOrder} />
              )}
              components={{
                body: {
                  row: SortableRow,
                },
              }}
            />
          </SortableContext>
        </DndContext>
      </Card>
    </div>
  );
}
