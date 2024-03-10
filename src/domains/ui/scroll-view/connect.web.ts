import { ScrollViewCore } from ".";

export function connect(store: ScrollViewCore, $container: HTMLDivElement) {
  store.scrollTo = (position: Partial<{ left: number; top: number; animate: boolean }>) => {
    const { left, top } = position;
    $container.scrollTo({
      left,
      top,
      behavior: "instant",
    });
  };
}
