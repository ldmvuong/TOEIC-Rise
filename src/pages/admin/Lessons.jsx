import { useCallback, useEffect, useMemo, useState } from "react";
import { Col, Row, message } from "antd";
import LessonForm from "@/components/admin/lessons/LessonForm";
import LessonList from "@/components/admin/lessons/LessonList";
import useLesson from "@/hooks/useLesson";

export default function LessonsPage() {
  const lesson = useLesson();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (params) => {
      try {
        await lesson.fetchLessons(params);
      } catch (e) {
        message.error(
          e?.response?.data?.message || e?.message || "Failed to load lessons",
        );
      }
    },
    [lesson],
  );

  useEffect(() => {
    load({ page: 0, size: 10 });
  }, [load]);

  const handleSubmit = useCallback(
    async (values) => {
      setSaving(true);
      try {
        if (editing?.id) {
          await lesson.updateLesson(editing.id, values);
          message.success("Lesson updated");
        } else {
          await lesson.createLesson(values);
          message.success("Lesson created");
        }
        setEditing(null);
        await load({ page: lesson.meta.page, size: lesson.meta.size });
      } catch (e) {
        message.error(
          e?.response?.data?.message || e?.message || "Save failed",
        );
      } finally {
        setSaving(false);
      }
    },
    [editing?.id, lesson, load],
  );

  const handleEdit = useCallback((row) => setEditing(row), []);

  const handleDelete = useCallback(
    async (row) => {
      if (!row?.id) return;
      try {
        await lesson.deleteLesson(row.id);
        message.success("Lesson deleted");
        if (editing?.id === row.id) setEditing(null);
        await load({ page: lesson.meta.page, size: lesson.meta.size });
      } catch (e) {
        message.error(
          e?.response?.data?.message || e?.message || "Delete failed",
        );
      }
    },
    [editing?.id, lesson, load],
  );

  const listLoading = useMemo(() => lesson.loading, [lesson.loading]);

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <LessonForm
            initialValues={editing}
            loading={saving}
            onSubmit={handleSubmit}
            onCancelEdit={() => setEditing(null)}
          />
        </Col>
        <Col xs={24} lg={14}>
          <LessonList
            data={lesson.list}
            loading={listLoading}
            meta={lesson.meta}
            onRefresh={load}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Col>
      </Row>
    </div>
  );
}
