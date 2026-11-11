/** Opt-in inside an app-owned fixture. Does not impose token or theme semantics. */
export function installThemeAdapter(applyTheme, { themes = ['light', 'dark'] } = {}) {
  const fromQuery = new URL(location.href).searchParams.get('workbenchTheme');
  if (themes.includes(fromQuery)) Promise.resolve().then(() => applyTheme(fromQuery)).catch(() => { /* Query application is advisory, never confirmation. */ });
  const listener = async event => {
    if (event.source !== window.parent || event.data?.type !== 'workbench:set-theme' || !themes.includes(event.data.theme) || typeof event.data.requestId !== 'string') return;
    try {
      await applyTheme(event.data.theme);
      window.parent.postMessage({ type: 'workbench:theme-applied', theme: event.data.theme, requestId: event.data.requestId }, event.origin === 'null' ? '*' : event.origin);
    } catch { /* Do not report successful application when the app rejects it. */ }
  };
  window.addEventListener('message', listener);
  // React effects may install after iframe load. Announce readiness without claiming success.
  if (window.parent !== window) window.parent.postMessage({ type: 'workbench:theme-ready' }, '*');
  return () => window.removeEventListener('message', listener);
}
