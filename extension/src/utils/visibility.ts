let documentVisibilityListener: (() => void) | null = null;

let documentIsVisible_ = !document.hidden;

const listenerOptions: any = {
  capture: true,
  passive: true,
};

function watchForDocumentVisibility(): void {
  document.addEventListener(
    "visibilitychange",
    documentVisibilityListener!,
    listenerOptions,
  );
  window.addEventListener(
    "pageshow",
    documentVisibilityListener!,
    listenerOptions,
  );
  window.addEventListener(
    "focus",
    documentVisibilityListener!,
    listenerOptions,
  );
}

function stopWatchingForDocumentVisibility(): void {
  document.removeEventListener(
    "visibilitychange",
    documentVisibilityListener!,
    listenerOptions,
  );
  window.removeEventListener(
    "pageshow",
    documentVisibilityListener!,
    listenerOptions,
  );
  window.removeEventListener(
    "focus",
    documentVisibilityListener!,
    listenerOptions,
  );
}

export function setDocumentVisibilityListener(callback: () => void): void {
  const alreadyWatching = Boolean(documentVisibilityListener);
  documentVisibilityListener = () => {
    if (!document.hidden) {
      removeDocumentVisibilityListener();
      callback();
      documentIsVisible_ = true;
    }
  };
  if (!alreadyWatching) {
    watchForDocumentVisibility();
  }
}

export function removeDocumentVisibilityListener(): void {
  stopWatchingForDocumentVisibility();
  documentVisibilityListener = null;
}

export function documentIsVisible(): boolean {
  return documentIsVisible_;
}
