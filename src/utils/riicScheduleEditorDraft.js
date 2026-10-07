const STORAGE_KEY = "riic_maa_schedule_editor_route_draft_v1";

export function readRiicScheduleEditorDraft() {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  try {
    const draft = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    return draft?.version === 1 && Array.isArray(draft.plans) ? draft : null;
  } catch {
    return null;
  }
}

export function writeRiicScheduleEditorDraft(draft) {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, version: 1 }),
    );
  } catch {
    // Route navigation should remain usable if session storage is unavailable.
  }
}
