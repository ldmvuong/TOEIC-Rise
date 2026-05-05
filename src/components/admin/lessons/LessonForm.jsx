import { memo, useCallback, useEffect } from "react";
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { Controller, useForm } from "react-hook-form";
import LessonVideoUrlField from "./LessonVideoUrlField";
import { isValidExternalVideoUrl } from "@/utils/lessonValidation";

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "PUBLISHED", label: "PUBLISHED" },
  { value: "ARCHIVED", label: "ARCHIVED" },
];

function LessonForm({ initialValues, loading, onSubmit, onCancelEdit }) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      status: "DRAFT",
      videoUrl: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    reset({
      title: initialValues?.title || "",
      description: initialValues?.description || "",
      status: initialValues?.status || "DRAFT",
      videoUrl: initialValues?.videoUrl || "",
    });
  }, [initialValues, reset]);

  const videoUrl = watch("videoUrl");

  const submit = useCallback(
    async (values) => {
      const videoUrl = (getValues("videoUrl") || "").trim();
      const trimmed = {
        ...values,
        title: (values.title || "").trim(),
        description: (values.description || "").trim(),
        videoUrl,
      };

      if (!trimmed.title) {
        message.error("Title is required");
        return;
      }
      if (trimmed.videoUrl && !isValidExternalVideoUrl(trimmed.videoUrl)) {
        message.error("Video URL must be a valid http/https URL");
        return;
      }

      await onSubmit?.(trimmed);
      reset(
        {
          title: "",
          description: "",
          status: "DRAFT",
          videoUrl: "",
        },
        { keepDirty: false },
      );
    },
    [getValues, onSubmit, reset],
  );

  return (
    <Card
      variant="outlined"
      style={{ borderRadius: 12 }}
      title={
        <div className="flex items-center justify-between">
          <Title level={5} style={{ margin: 0 }}>
            {initialValues?.id ? "Edit lesson" : "Create lesson"}
          </Title>
          {initialValues?.id ? (
            <Button onClick={onCancelEdit} disabled={loading}>
              Exit edit
            </Button>
          ) : null}
        </div>
      }
    >
      <Form layout="vertical" onFinish={handleSubmit(submit)}>
        <Controller
          name="title"
          control={control}
          rules={{
            required: "Title is required",
            maxLength: { value: 120, message: "Max 120 characters" },
          }}
          render={({ field }) => (
            <Form.Item
              label="Title"
              required
              validateStatus={errors.title ? "error" : ""}
              help={errors.title?.message}
            >
              <Input {...field} placeholder="Lesson title" />
            </Form.Item>
          )}
        />

        <Controller
          name="description"
          control={control}
          rules={{
            maxLength: { value: 2000, message: "Max 2000 characters" },
          }}
          render={({ field }) => (
            <Form.Item
              label="Description"
              validateStatus={errors.description ? "error" : ""}
              help={errors.description?.message}
            >
              <Input.TextArea
                {...field}
                rows={4}
                placeholder="Short description"
              />
            </Form.Item>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Form.Item label="Status">
                <Select
                  {...field}
                  options={STATUS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Form.Item>
            )}
          />

          <Form.Item label="Video source">
            <Text type="secondary">Paste a video URL (http/https).</Text>
          </Form.Item>
        </div>

        <Controller
          name="videoUrl"
          control={control}
          render={({ field }) => (
            <Form.Item
              validateStatus={errors.videoUrl ? "error" : ""}
              help={errors.videoUrl?.message}
            >
              <LessonVideoUrlField
                value={field.value}
                onChange={field.onChange}
              />
            </Form.Item>
          )}
        />

        <Space className="mt-3" wrap>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues?.id ? "Save changes" : "Create lesson"}
          </Button>
          <Button
            onClick={() =>
              reset({
                title: initialValues?.title || "",
                description: initialValues?.description || "",
                status: initialValues?.status || "DRAFT",
                videoUrl: initialValues?.videoUrl || "",
              })
            }
            disabled={loading || !isDirty}
          >
            Reset
          </Button>
          {videoUrl ? (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              Video URL set
            </Text>
          ) : null}
        </Space>
      </Form>
    </Card>
  );
}

export default memo(LessonForm);
