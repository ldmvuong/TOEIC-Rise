export const toSlug = (s = "") =>
  s.normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/đ/g, "d").replace(/Đ/g, "D")
   .trim().toLowerCase()
   .replace(/[^a-z0-9]+/g, "-")
   .replace(/^-+|-+$/g, "");
