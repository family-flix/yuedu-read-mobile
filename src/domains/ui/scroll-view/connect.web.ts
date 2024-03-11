import { ScrollViewCore } from "./index";

export function connect(store: ScrollViewCore, $container: HTMLDivElement) {
  store.scrollTo = (position: Partial<{ left: number; top: number; animate: boolean }>) => {
    const { left, top, animate = false } = position;
    $container.scrollTo({
      left,
      top,
      // @ts-ignore
      behavior: animate ? "smooth" : "instant",
    });
  };
}
