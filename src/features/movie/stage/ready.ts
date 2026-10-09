export function imagesReady(element: HTMLElement): Promise<void> {
  const view = { height: window.innerHeight, width: window.innerWidth };
  const pending = [...element.querySelectorAll("img")].filter((image) => {
    if (image.complete) return false;
    const box = image.getBoundingClientRect();
    return (
      box.width > 0 &&
      box.top < view.height * 1.2 &&
      box.bottom > 0 &&
      box.left < view.width &&
      box.right > 0
    );
  });
  return Promise.all(
    pending.map(
      (image) =>
        new Promise<void>((resolve) => {
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }),
    ),
  ).then(() => undefined);
}
