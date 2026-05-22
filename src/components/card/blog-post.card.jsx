import { Card } from "antd";
import { CalendarOutlined, EyeOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

function formatUpdatedAt(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const d = dayjs(normalized);
  return d.isValid() ? d.format("MMM D, YYYY") : String(value);
}

/**
 * Reusable blog post card.
 * - Clickable when `onClick` provided (also keyboard accessible)
 * - Thumbnail: blurred cover background + contain foreground (avoids crop + avoids empty bars)
 * - Optional "New" badge at top-right
 */
export default function BlogPostCard({
  post,
  onClick,
  showNewBadge = false,
  newBadgeText = "New",
  showMeta = true,
  className = "",
  bodyPadding = 14,
  imageHeight = 150,
}) {
  const clickable = typeof onClick === "function";
  const title = post?.title || "Untitled";
  const summary = post?.summary;
  const thumbnailUrl = post?.thumbnailUrl;

  return (
    <Card
      hoverable={clickable}
      className={`rounded-2xl border-slate-200 shadow-sm transition-all ${
        clickable ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer" : ""
      } ${className}`}
      styles={{ body: { padding: bodyPadding } }}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : -1}
    >
      {thumbnailUrl ? (
        <div
          className="rounded-xl overflow-hidden bg-slate-100 mb-3 relative"
          style={{ height: imageHeight }}
        >
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: "center center",
              filter: "blur(10px)",
              transform: "scale(1.06)",
              opacity: 0.35,
            }}
            loading="lazy"
          />
          <img
            src={thumbnailUrl}
            alt=""
            className="relative w-full h-full"
            style={{
              objectFit: "contain",
              objectPosition: "center center",
            }}
            loading="lazy"
          />
          {showNewBadge ? (
            <div className="absolute top-2 right-2 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
              {newBadgeText}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="rounded-xl bg-gradient-to-br from-slate-100 via-white to-indigo-50 border border-slate-200 mb-3 relative"
          style={{ height: imageHeight }}
        >
          {showNewBadge ? (
            <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
              {newBadgeText}
            </div>
          ) : null}
        </div>
      )}

      <div className="text-base font-semibold text-slate-900 line-clamp-2">
        {title}
      </div>
      {summary ? (
        <div className="mt-1 text-sm text-slate-600 line-clamp-3">
          {summary}
        </div>
      ) : null}

      {showMeta ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {post?.authorName ? (
            <span className="inline-flex items-center gap-1">
              <UserOutlined />
              {post.authorName}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <CalendarOutlined />
            {formatUpdatedAt(post?.updatedAt)}
          </span>
          {post?.views != null ? (
            <span className="inline-flex items-center gap-1">
              <EyeOutlined />
              {Number(post.views).toLocaleString()}
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

