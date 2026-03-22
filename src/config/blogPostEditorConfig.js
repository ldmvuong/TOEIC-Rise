/**
 * CKEditor 5 (Classic build) for blog post body.
 * Uses the same GPL build as ReportDetail / QuestionGroup; extends toolbar with
 * headings (H1–H3 for outline/TOC), lists, link, table (insert/merge cells).
 * Note: Underline is not included in @ckeditor/ckeditor5-build-classic — use Bold/Italic or a custom build if required.
 */
export const blogPostEditorConfiguration = {
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
  // Classic build includes Table + merge; tableProperties plugins are not in this build.
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
};
