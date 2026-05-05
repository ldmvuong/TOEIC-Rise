import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

/**
 * Same feature set as the blog post content editor (BlogPostCreate), without Image / ImageUpload or in-editor image toolbar.
 */
const passageEditorConfiguration = {
  licenseKey: "GPL",
  heading: {
    options: [
      {
        model: "paragraph",
        title: "Paragraph",
        class: "ck-heading_paragraph",
      },
      {
        model: "heading1",
        view: "h1",
        title: "Heading 1",
        class: "ck-heading_heading1",
      },
      {
        model: "heading2",
        view: "h2",
        title: "Heading 2",
        class: "ck-heading_heading2",
      },
      {
        model: "heading3",
        view: "h3",
        title: "Heading 3",
        class: "ck-heading_heading3",
      },
    ],
  },
  toolbar: [
    "undo",
    "redo",
    "|",
    "heading",
    "|",
    "bold",
    "italic",
    "|",
    "numberedList",
    "bulletedList",
    "|",
    "link",
    "insertTable",
    "blockQuote",
  ],
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
};

const WRAPPER_STYLES = `
  .passage-ckeditor-scope {
    width: 100%;
    display: block;
  }
  .passage-ckeditor-scope .ck-editor__editable {
    min-height: 420px !important;
    padding: 18px 20px;
    background: #fff;
    font-size: 14px;
    line-height: 1.75;
    color: #0f172a;
    box-sizing: border-box;
    width: 100%;
  }
  .passage-ckeditor-scope .ck-editor__editable:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
  }
  .passage-ckeditor-scope .ck-editor {
    min-height: 480px;
    width: 100%;
  }
  .passage-ckeditor-scope .ck-editor__main {
    width: 100%;
  }
  .passage-ckeditor-scope .ck-editor__top {
    width: 100%;
  }
  .passage-ckeditor-scope .ck-toolbar {
    background: linear-gradient(#f8fafc, #f1f5f9);
    border-bottom: 1px solid #e2e8f0;
    width: 100%;
    padding: 0 8px;
  }
  .passage-ckeditor-scope .ck-toolbar__items {
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
    justify-content: flex-start;
  }
  .passage-ckeditor-scope .ck-content {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
      "Apple Color Emoji", "Segoe UI Emoji";
  }
  .passage-ckeditor-scope .ck-content a {
    color: #2563eb;
    text-decoration: none;
    border-bottom: 1px solid rgba(37, 99, 235, 0.35);
  }
  .passage-ckeditor-scope .ck-content a:hover {
    color: #1d4ed8;
    border-bottom-color: rgba(29, 78, 216, 0.6);
  }
  .passage-ckeditor-scope .ck-content p {
    margin: 0 0 0.75rem;
  }
  .passage-ckeditor-scope .ck-content h1,
  .passage-ckeditor-scope .ck-content h2,
  .passage-ckeditor-scope .ck-content h3 {
    margin: 1.2em 0 0.6em;
    font-weight: 800;
    line-height: 1.25;
    color: #0f172a;
  }
  .passage-ckeditor-scope .ck-content h1 {
    font-size: 26px;
  }
  .passage-ckeditor-scope .ck-content h2 {
    font-size: 21px;
  }
  .passage-ckeditor-scope .ck-content h3 {
    font-size: 17px;
  }
  .passage-ckeditor-scope .ck-content ul,
  .passage-ckeditor-scope .ck-content ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0 0.75rem;
  }
  .passage-ckeditor-scope .ck-content li {
    margin: 0.25rem 0;
  }
  .passage-ckeditor-scope .ck-content img {
    max-width: 100%;
    height: auto;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
  }
  .passage-ckeditor-scope .ck-content hr {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 1rem 0;
  }
  .passage-ckeditor-scope .ck-content blockquote {
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    border-left: 4px solid #818cf8;
    background: #eef2ff;
    border-radius: 10px;
    color: #334155;
  }
  .passage-ckeditor-scope .ck-content table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 1rem 0;
  }
  .passage-ckeditor-scope .ck-content table th {
    background: #f8fafc;
    font-weight: 700;
    color: #0f172a;
  }
  .passage-ckeditor-scope .ck-content table td,
  .passage-ckeditor-scope .ck-content table th {
    border: 1px solid #e5e7eb;
    padding: 10px 12px;
    vertical-align: top;
  }
  .passage-ckeditor-scope .ck-content pre {
    background: #0b1220;
    color: #e5e7eb;
    padding: 14px;
    border-radius: 12px;
    overflow: auto;
  }
  .passage-ckeditor-scope .ck-content code {
    background: #f1f5f9;
    padding: 0 6px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
    font-size: 12.5px;
  }
  .passage-ckeditor-scope .ck-content pre code {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
  }
`;

/**
 * @param {string} data - HTML passed to CKEditor
 * @param {(html: string) => void} onChange - receives editor HTML
 */
export default function PassageCKEditor({ data, onChange }) {
  return (
    <div className="passage-ckeditor-scope rounded border border-slate-200 overflow-hidden bg-white">
      <style>{WRAPPER_STYLES}</style>
      <CKEditor
        editor={ClassicEditor}
        data={data ?? ""}
        config={passageEditorConfiguration}
        onChange={(_event, editor) => {
          onChange?.(editor.getData());
        }}
      />
    </div>
  );
}
