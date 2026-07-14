export const MODAL_POSITIONS = Object.freeze({
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
});

export const MODAL_CHROME = Object.freeze({
  PANEL: 'panel',
  BARE: 'bare',
});

export const MODAL_BREAKPOINTS = Object.freeze({
  MOBILE_MAX_WIDTH: 639,
});

export const MODAL_PRESETS = Object.freeze({
  PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
  VIDEO_PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
});

export const MODAL_LABELS = Object.freeze({
  ACCOUNT_SOCIAL_MODAL: 'Social',
  CAST_MODAL: 'Cast',
  CREATE_LIST_MODAL: 'Create List',
  LIST_EDITOR_MODAL: 'Edit List',
  LIST_PICKER_MODAL: 'Your Lists',
  MEDIA_SOCIAL_PROOF_MODAL: 'Social Proof',
  PREVIEW_MODAL: 'Preview',
  REVIEW_EDITOR_MODAL: 'Review',
  VIDEO_PREVIEW_MODAL: 'Video',
});
