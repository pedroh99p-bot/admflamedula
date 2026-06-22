export function getCloudinaryUploadStrategy() {
  return {
    implemented: false,
    productionRequirement: "Upload assinado por Edge Function ou backend.",
    frontendRule: "Nao expor API secret do Cloudinary no navegador.",
    databaseFields: [
      "image_url",
      "thumbnail_url",
      "image_alt",
      "cloudinary_public_id"
    ]
  };
}
