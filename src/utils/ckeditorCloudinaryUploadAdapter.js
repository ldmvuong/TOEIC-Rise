import { uploadCloudinaryImage } from "@/api/api";

class CloudinaryImageUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then((file) => {
      const formData = new FormData();
      // Backend expects Multipart @ModelAttribute CloudinaryImageRequest.image
      formData.append("image", file);
      return uploadCloudinaryImage(formData).then((res) => {
        const url = res?.data;
        if (!url) {
          throw new Error("Image upload succeeded but no URL returned");
        }
        return { default: url };
      });
    });
  }

  abort() {
    // Optional: axios request cancellation can be added later.
  }
}

export function createCloudinaryImageUploadAdapterPlugin() {
  return function CloudinaryImageUploadAdapterPlugin(editor) {
    const fileRepository = editor.plugins.get("FileRepository");
    fileRepository.createUploadAdapter = (loader) =>
      new CloudinaryImageUploadAdapter(loader);
  };
}

