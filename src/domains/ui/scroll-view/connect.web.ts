import { ScrollViewCore } from "./index";

export function connect(store: ScrollViewCore, $container: HTMLDivElement) {
  if (store.connected) {
    return;
  }
  store.connected = true;
  store.scrollTo = (position: Partial<{ left: number; top: number; animate: boolean }>) => {
    const { left, top, animate = false } = position;
    $container.scrollTo({
      left,
      top,
      // @ts-ignore
      behavior: animate ? "smooth" : "instant",
    });
  };
  store.refreshRect = () => {
    const { scrollHeight } = $container;
    store.setRect({
      contentHeight: scrollHeight,
    });
  };
}
