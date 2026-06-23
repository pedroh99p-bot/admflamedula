export const contentState = {
  activeType: "hero_news",
  filters: {
    status: "",
    query: "",
    sort: "sort_order"
  },
  items: [],
  loading: false,
  error: "",
  initialized: false,
  editorOpen: false,
  editorMode: "create",
  editingId: null,
  formData: {},
  selectedAsset: null,
  saving: false,
  deletingId: null,
  returnFocus: null,
  role: "viewer"
};

export function resetEditorState() {
  contentState.editorOpen = false;
  contentState.editorMode = "create";
  contentState.editingId = null;
  contentState.formData = {};
  contentState.selectedAsset = null;
  contentState.saving = false;
}

export function canMutateContent() {
  return ["super_admin", "admin", "operator"].includes(contentState.role);
}

export function canDeleteContent() {
  return ["super_admin", "admin"].includes(contentState.role);
}

export function canEditSiteSettings() {
  return ["super_admin", "admin"].includes(contentState.role);
}
