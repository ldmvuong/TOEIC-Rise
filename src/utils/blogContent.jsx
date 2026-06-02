import parse, { domToReact } from "html-react-parser";

export function getBackendBaseUrl() {
  if (typeof window === "undefined") {
    return (import.meta?.env?.VITE_BACKEND_URL || "").trim();
  }
  return (
    (import.meta?.env?.VITE_BACKEND_URL || "").trim() || window.location.origin
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

function renderResponsiveTable(tableNode, replace) {
  const props = normalizeDomAttribs(tableNode.attribs);
  delete props.width;
  delete props.height;
  props.className = [
    props.className,
    "w-full",
    "max-w-full",
    "border-collapse",
    "table-auto",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="my-4 w-full max-w-full overflow-x-auto">
      <table {...props}>
        {domToReact(tableNode.children, { replace })}
      </table>
    </div>
  );
}

export function renderBlogHtml(html, { baseUrl } = {}) {
  const backendBaseUrl = (baseUrl || getBackendBaseUrl()).trim();
  const content = String(html || "");

  const replace = (domNode) => {
    if (domNode?.type !== "tag") return undefined;

    if (domNode?.name === "figure") {
      const figureClass = domNode?.attribs?.class || "";
      if (/\btable\b/.test(figureClass)) {
        const tableNode = domNode.children?.find(
          (child) => child.type === "tag" && child.name === "table",
        );
        if (tableNode) return renderResponsiveTable(tableNode, replace);
        return (
          <div className="my-4 w-full max-w-full overflow-x-auto">
            {domToReact(domNode.children, { replace })}
          </div>
        );
      }
    }

    if (domNode?.name === "table") {
      return renderResponsiveTable(domNode, replace);
    }

    if (domNode?.name === "td" || domNode?.name === "th") {
      const props = normalizeDomAttribs(domNode.attribs);
      delete props.width;
      delete props.height;
      props.className = [props.className, "break-words", "text-left", "align-middle"]
        .filter(Boolean)
        .join(" ");
      const Tag = domNode.name;
      return (
        <Tag {...props}>{domToReact(domNode.children, { replace })}</Tag>
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
          {domToReact(domNode.children, { replace })}
        </a>
      );
    }

    return undefined;
  };

  return parse(content, { replace });
}
