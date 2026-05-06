import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import LessonVideoUrlField from "@/components/admin/lessons/LessonVideoUrlField";
import { createCloudinaryImageUploadAdapterPlugin } from "@/utils/ckeditorCloudinaryUploadAdapter";
import {
  createLearningPathLesson,
  getAdminLearningPathDetail,
  updateAdminLesson,
} from "@/api/api";

const { Title, Text } = Typography;

const TOPIC_OPTIONS = [
  "VOCABULARY",
  "GRAMMAR",
  "PRONUNCIATION",
  "SPEAKING",
  "READING",
  "WRITING",
  "LISTENING",
].map((v) => ({ value: v, label: v }));

const LEVEL_OPTIONS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((v) => ({
  value: v,
  label: v,
}));

function nextLessonOrderIndex(detail) {
  const lessons = Array.isArray(detail?.lessons) ? detail.lessons : [];
  return lessons.length + 1;
}

export default function AdminLearningPathLessonEditorPage() {
  const { id, lessonId } = useParams();
  const navigate = useNavigate();
  const learningPathId = useMemo(() => id, [id]);
  const isEdit = Boolean(lessonId);

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pathName, setPathName] = useState("");
  const [contentInitial, setContentInitial] = useState("");
  const contentRef = useRef("");
  const contentSyncTimerRef = useRef(null);

  const loadForEdit = useCallback(async () => {
    if (!learningPathId) return;
    if (!isEdit) {
      setLoading(true);
      try {
        const res = await getAdminLearningPathDetail(learningPathId);
        const detail = res?.data ?? {};
        setPathName(detail?.name || `Learning Path #${learningPathId}`);
        const nextOrder = nextLessonOrderIndex(detail);
        form.setFieldsValue({
          title: "",
          slug: "",
          practice: "",
          videoUrl: "",
          topic: "VOCABULARY",
          level: "BEGINNER",
          content: "",
          isActive: true,
          orderIndex: nextOrder,
        });
        setContentInitial("");
        contentRef.current = "";
      } catch (e) {
        message.error(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load learning path",
        );
        setPathName(`Learning Path #${learningPathId}`);
        form.setFieldsValue({
          title: "",
          slug: "",
          practice: "",
          videoUrl: "",
          topic: "VOCABULARY",
          level: "BEGINNER",
          content: "",
          isActive: true,
          orderIndex: 1,
        });
        setContentInitial("");
        contentRef.current = "";
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await getAdminLearningPathDetail(learningPathId);
      const detail = res?.data ?? {};
      setPathName(detail?.name || `Learning Path #${learningPathId}`);
      const lesson = Array.isArray(detail?.lessons)
        ? detail.lessons.find((l) => String(l.id) === String(lessonId))
        : null;
      if (!lesson) {
        message.error("Lesson not found");
        navigate(`/admin/learning-paths/${learningPathId}`);
        return;
      }
      form.setFieldsValue({
        title: lesson?.title ?? "",
        slug: lesson?.slug ?? "",
        practice: lesson?.practice ?? "",
        videoUrl: lesson?.videoUrl ?? "",
        topic: lesson?.topic ?? "",
        level: lesson?.level ?? "",
        content: lesson?.content ?? "",
        isActive: Boolean(lesson?.isActive),
        orderIndex: lesson?.orderIndex ?? 1,
      });
      setContentInitial(lesson?.content ?? "");
      contentRef.current = lesson?.content ?? "";
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Failed to load lesson",
      );
    } finally {
      setLoading(false);
    }
  }, [form, isEdit, learningPathId, lessonId, navigate]);

  useEffect(() => {
    loadForEdit();
  }, [loadForEdit]);

  const onSubmit = useCallback(async () => {
    if (!learningPathId) return;

    // Ensure form has latest editor HTML before validation/submission.
    form.setFieldValue("content", contentRef.current || "");
    try {
      await form.validateFields();
    } catch {
      return;
    }

    try {
      setLoading(true);
      const values = form.getFieldsValue();
      const videoUrl = (values.videoUrl || "").trim();

      if (isEdit) {
        await updateAdminLesson(lessonId, {
          title: values.title,
          slug: (values.slug || "").trim(),
          practice: values.practice ?? "",
          ...(videoUrl ? { videoUrl } : {}),
          topic: values.topic,
          level: values.level,
          content: values.content,
          isActive: values.isActive,
          orderIndex: Number(values.orderIndex),
        });
        message.success("Updated lesson");
      } else {
        const detailRes = await getAdminLearningPathDetail(learningPathId);
        const detail = detailRes?.data ?? {};
        const orderIndex = nextLessonOrderIndex(detail);
        await createLearningPathLesson(Number(learningPathId), {
          title: values.title,
          slug: (values.slug || "").trim(),
          practice: values.practice ?? "",
          ...(videoUrl ? { videoUrl } : {}),
          topic: values.topic,
          level: values.level,
          content: values.content ?? "",
          isActive: values.isActive,
          orderIndex,
        });
        message.success("Created lesson");
      }

      navigate(`/admin/learning-paths/${learningPathId}`);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }, [form, isEdit, learningPathId, lessonId, navigate]);

  return (
    <div style={{ padding: 16 }}>
      <div className="mb-4">
        <Link
          to={`/admin/learning-paths/${learningPathId}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to detail
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <Title level={4} style={{ margin: 0 }}>
            {isEdit ? `Edit lesson #${lessonId}` : "Add lesson"}
          </Title>
          <Tag style={{ marginInlineEnd: 0 }}>{pathName}</Tag>
        </div>
      </div>

      <Card variant="outlined" style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="Lesson title" />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Slug"
              name="slug"
              rules={[
                { required: true, message: "Slug is required" },
                {
                  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
                  message: "Slug only allows letters, digits, and '-'",
                },
              ]}
            >
              <Input placeholder="lesson-7" />
            </Form.Item>
            <Form.Item label="Practice" name="practice">
              <Input placeholder="0" />
            </Form.Item>
          </div>

          <Form.Item name="videoUrl">
            <LessonVideoUrlField
              value={form.getFieldValue("videoUrl")}
              onChange={(url) => form.setFieldValue("videoUrl", url)}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Topic"
              name="topic"
              rules={[{ required: true, message: "Topic is required" }]}
            >
              <Select
                placeholder="Select topic"
                options={TOPIC_OPTIONS}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              label="Level"
              name="level"
              rules={[{ required: true, message: "Level is required" }]}
            >
              <Select placeholder="Select level" options={LEVEL_OPTIONS} />
            </Form.Item>
          </div>

          <Form.Item label="Content">
            <div className="rounded-lg border border-gray-200">
              <CKEditor
                key={`${learningPathId || "lp"}-${lessonId || "new"}-${isEdit ? "edit" : "create"}`}
                editor={ClassicEditor}
                data={contentInitial}
                config={{
                  licenseKey: "GPL",
                  extraPlugins: [createCloudinaryImageUploadAdapterPlugin()],
                }}
                onReady={(editor) => {
                  // Keep a local ref so we can sync to antd Form without re-rendering editor on every keystroke.
                  contentRef.current = editor.getData() || "";
                }}
                onChange={(_event, editor) => {
                  const data = editor.getData();
                  contentRef.current = data;

                  // Debounce syncing to antd Form to avoid selection/caret jumps when clicking toolbar buttons.
                  if (contentSyncTimerRef.current) {
                    clearTimeout(contentSyncTimerRef.current);
                  }
                  contentSyncTimerRef.current = setTimeout(() => {
                    form.setFieldValue("content", contentRef.current || "");
                  }, 250);
                }}
                onBlur={() => {
                  if (contentSyncTimerRef.current)
                    clearTimeout(contentSyncTimerRef.current);
                  form.setFieldValue("content", contentRef.current || "");
                }}
              />
            </div>
            <Form.Item name="content" noStyle>
              <Input type="hidden" />
            </Form.Item>
          </Form.Item>

          <Form.Item name="isActive" valuePropName="checked" hidden>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item name="orderIndex" hidden>
            <Input type="hidden" />
          </Form.Item>

          <Space>
            <Button type="primary" onClick={onSubmit} loading={loading}>
              {isEdit ? "Save" : "Create"}
            </Button>
            <Button
              onClick={() =>
                navigate(`/admin/learning-paths/${learningPathId}`)
              }
              disabled={loading}
            >
              Cancel
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
