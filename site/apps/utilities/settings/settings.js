export function createApp(osAPI) {
  osAPI?.openSettingsWindow?.();
  return { skipWindow: true };
}
