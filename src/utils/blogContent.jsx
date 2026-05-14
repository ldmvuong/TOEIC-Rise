import parse, { domToReact } from "html-react-parser";

export function getBackendBaseUrl() {
  if (typeof window === "undefined") {
    return (import.meta?.env?.VITE_BACKEND_URL || "").trim();
  }
  return (
    (import.meta?.env?.VITE_BACKEND_URL || "").trim() ||
    window.location.origin
  );
}

function resolveMaybeRelativeUrl(rawUrl, baseUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("//")) {
    const protocol =
      typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}${url}`;
  }

  const base = String(baseUrl || "").replace(/\/+$/g, "");
  if (!base) return url;

  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url.replace(/^\/+/g, "")}`;
}

function normalizeDomAttribs(attribs = {}) {
  const next = { ...attribs };

  // React expects style as an object, not a string (HTML provides string).
  // Drop inline styles to avoid runtime crash; layout is handled by page CSS.
  if (typeof next.style === "string") {
    delete next.style;
  }

  // Map HTML class -> React className
  if (typeof next.class === "string" && !next.className) {
    next.className = next.class;
  }
  delete next.class;

  return next;
}

export function renderBlogHtml(html, { baseUrl } = {}) {
  const backendBaseUrl = (baseUrl || getBackendBaseUrl()).trim();
  const content = String(html || "");

  return parse(content, {
    replace: (domNode) => {
      if (domNode?.type !== "tag") return undefined;

      if (domNode?.name === "table") {
        return (
          <div className="my-4 w-full overflow-x-auto">
            <table className="min-w-max w-full">
              {domToReact(domNode.children)}
            </table>
          </div>
        );
      }

      if (domNode?.name === "img") {
        const src = domNode?.attribs?.src;
        const nextSrc = resolveMaybeRelativeUrl(src, backendBaseUrl);
        const alt = domNode?.attribs?.alt ?? "";
        const props = normalizeDomAttribs(domNode.attribs);
        return <img {...props} src={nextSrc || src} alt={alt} />;
      }

      if (domNode?.name === "a") {
        const href = domNode?.attribs?.href;
        const nextHref = resolveMaybeRelativeUrl(href, backendBaseUrl);
        const props = normalizeDomAttribs(domNode.attribs);
        return (
          <a {...props} href={nextHref || href}>
            {domToReact(domNode.children)}
          </a>
        );
      }

      return undefined;
    },
  });
}

