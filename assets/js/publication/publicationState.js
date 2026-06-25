export const publicationState = {
  activeType: "hero_news", // 'hero_news', 'actions', 'media_items'
  items: [],
  loading: false,
  error: "",
  editorOpen: false,
  editorMode: "create", // 'create' ou 'edit'
  editingId: null,
  formData: {},
  selectedAsset: null,
  pendingMediaRegistration: null,
  uploadStatus: "idle",
  uploadError: "",
  saving: false,
  role: "viewer", // 'owner', 'editor', 'viewer'
  page: 1,
  pageSize: 10,
  totalItems: 0
};

export function resetPublicationEditorState() {
  publicationState.editorOpen = false;
  publicationState.editorMode = "create";
  publicationState.editingId = null;
  publicationState.formData = {};
  publicationState.selectedAsset = null;
  publicationState.pendingMediaRegistration = null;
  publicationState.uploadStatus = "idle";
  publicationState.uploadError = "";
  publicationState.saving = false;
}
