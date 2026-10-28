const APP_LOADING_EVENT = "fullreports-loading";

function setAppLoading(active: boolean) {
  window.dispatchEvent(
    new CustomEvent(APP_LOADING_EVENT, { detail: { active } }),
  );
}

export function startAppLoading() {
  setAppLoading(true);
}

export function finishAppLoading() {
  setAppLoading(false);
}

export async function withAppLoading<T>(action: () => Promise<T>): Promise<T> {
  startAppLoading();
  try {
    return await action();
  } finally {
    finishAppLoading();
  }
}

export function subscribeToAppLoading(listener: (active: boolean) => void) {
  const handleEvent = (event: Event) => {
    if (
      event instanceof CustomEvent &&
      typeof event.detail?.active === "boolean"
    ) {
      listener(event.detail.active);
    }
  };
  window.addEventListener(APP_LOADING_EVENT, handleEvent);
  return () => window.removeEventListener(APP_LOADING_EVENT, handleEvent);
}
