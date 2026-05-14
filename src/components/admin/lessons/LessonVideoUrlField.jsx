import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { Button, Input, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { isValidExternalVideoUrl } from "@/utils/lessonValidation";

const { Text } = Typography;

function isDirectVideoUrl(url) {
  const v = (url || "").trim().toLowerCase();
  if (!v) return false;
  return v.includes(".mp4") || v.includes(".webm");
}

function getYoutubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") {
      id = u.pathname.replace("/", "");
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
      if (u.pathname.startsWith("/embed/"))
        id = u.pathname.split("/embed/")[1] || "";
      if (u.pathname.startsWith("/shorts/"))
        id = u.pathname.split("/shorts/")[1] || "";
    }
    id = id.split("?")[0].split("&")[0];
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

function LessonVideoUrlField({ value, onChange }) {
  const [externalUrl, setExternalUrl] = useState(value || "");

  useEffect(() => {
    setExternalUrl(value || "");
  }, [value]);

  const handleExternalUrlChange = useCallback(
    (e) => {
      const next = e.target.value;
      setExternalUrl(next);
      onChange?.(next.trim());
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange?.("");
    setExternalUrl("");
  }, [onChange]);

  const urlHelp = useMemo(() => {
    if (!externalUrl) return null;
    return isValidExternalVideoUrl(externalUrl)
      ? {
          type: "success",
          text:
            isDirectVideoUrl(externalUrl) || getYoutubeEmbedUrl(externalUrl)
              ? "URL looks valid."
              : "URL looks valid (preview may not be supported).",
        }
      : { type: "danger", text: "URL invalid (must be http/https)." };
  }, [externalUrl]);

  const previewUrl = useMemo(() => (value || "").trim(), [value]);
  const youtubeEmbed = useMemo(
    () => getYoutubeEmbedUrl(previewUrl),
    [previewUrl],
  );
  const canVideoTagPreview = useMemo(
    () => Boolean(previewUrl) && isDirectVideoUrl(previewUrl),
    [previewUrl],
  );
  const showPreviewBlock = Boolean(previewUrl);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-3">
        <Text strong>Video</Text>
      </div>

      <div className="space-y-2">
        <Input
          value={externalUrl}
          onChange={handleExternalUrlChange}
          placeholder="https://... (MP4/WebM, YouTube, or streaming URL)"
          allowClear
        />
        {urlHelp ? (
          <Text type={urlHelp.type === "success" ? "success" : "danger"}>
            {urlHelp.text}
          </Text>
        ) : (
          <Text type="secondary">Paste a video URL (http/https).</Text>
        )}
      </div>

      {showPreviewBlock ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Text type="secondary">Preview</Text>
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleClear}
            >
              Clear URL
            </Button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            {youtubeEmbed ? (
              <div className="w-full">
                <div
                  className="relative w-full"
                  style={{ paddingTop: "56.25%" }}
                >
                  <iframe
                    title="Video preview"
                    src={youtubeEmbed}
                    className="absolute inset-0 h-full w-full rounded-md"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : canVideoTagPreview ? (
              <video
                key={previewUrl}
                src={previewUrl}
                controls
                className="w-full max-h-[320px] object-contain"
                onError={() => message.warning("Preview failed to load")}
              />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <Text type="secondary">
                  Preview is not available for this URL. Use a direct
                  `.mp4/.webm` link or YouTube URL.
                </Text>
                <Button type="link" href={previewUrl} target="_blank">
                  Open
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(LessonVideoUrlField);
