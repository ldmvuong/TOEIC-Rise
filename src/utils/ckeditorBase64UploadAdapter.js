export class Base64UploadAdapter {
  constructor(loader) {
    this.loader = loader;
    this.reader = null;
  }

  upload() {
    return this.loader.file.then(
      (file) =>
        new Promise((resolve, reject) => {
          if (!file) {
            reject(new Error("No file to upload"));
            return;
          }

          const reader = new FileReader();
          this.reader = reader;

          reader.onload = () => {
            resolve({ default: reader.result });
          };

          reader.onerror = () => {
            reject(new Error("Failed to read file"));
          };

          reader.onabort = () => {
            reject(new Error("Upload aborted"));
          };

          reader.readAsDataURL(file);
        }),
    );
  }

  abort() {
    if (this.reader) this.reader.abort();
  }
}

export function registerBase64UploadAdapter(editor) {
  if (!editor) return;
  const fileRepo = editor.plugins.get("FileRepository");
  if (!fileRepo) return;
  fileRepo.createUploadAdapter = (loader) => new Base64UploadAdapter(loader);
}
