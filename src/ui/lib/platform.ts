export const IS_MAC = /mac|iphone|ipad/i.test(
  (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform,
);

/** Ctrl on Windows/Linux, ⌘ on macOS. */
export const isModKey = (event: { metaKey: boolean; ctrlKey: boolean }) => (IS_MAC ? event.metaKey : event.ctrlKey);

export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl';
export const SHIFT_LABEL = IS_MAC ? '⇧' : 'Shift';
