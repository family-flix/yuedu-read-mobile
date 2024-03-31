import React, { useEffect, useRef, useState } from "react";

import { ScrollViewCore } from "@/domains/ui/scroll-view";
import { connectScroll, connectIndicator as connectIndicator } from "@/domains/ui/scroll-view/connect.web";
import { useInitialize } from "@/hooks";

export const Root = React.memo(
  (props: { store: ScrollViewCore } & React.HTMLAttributes<HTMLDivElement>) => {
    const { store, children, ...rest } = props;

    const elmRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const elm = elmRef.current;
      if (!elm) {
        return;
      }
      store.setRect({
        width: elm.clientWidth,
        height: elm.clientHeight,
      });
      store.setMounted();
      connectScroll(store, elm);
      return () => {
        store.destroy();
      };
    }, []);

    return (
      <div
        className={props.className}
        ref={(e) => {
          elmRef.current = e;
        }}
        onClick={props.onClick}
      >
        {props.children}
      </div>
    );
  },
  () => false
);
export const Indicator = React.memo(
  (props: { store: ScrollViewCore } & React.HTMLAttributes<HTMLDivElement>) => {
    const { store } = props;

    const elmRef = useRef<HTMLDivElement | null>(null);
    // const [visible, setVisible] = useState(true);

    useEffect(() => {
      const elm = elmRef.current;
      if (!elm) {
        return;
      }
      connectIndicator(store, elm);
    }, []);

    return (
      <div
        ref={(e) => {
          elmRef.current = e;
        }}
        className={props.className}
        style={{ height: 0 }}
      >
        {props.children}
      </div>
    );
  },
  () => false
);
export const Progress = React.memo(
  (props: { store: ScrollViewCore } & React.HTMLAttributes<HTMLDivElement>) => {
    const { store } = props;

    const ref = useRef<null | HTMLDivElement>(null);

    useInitialize(() => {
      store.inDownOffset(() => {
        // console.log("[]Progress - store.onInOffset", ref);
        if (!ref.current) {
          return;
        }
        ref.current.style.display = "block";
      });
      store.onPullToRefresh(() => {
        // console.log("[]Progress - store.onPullToRefresh");
        if (!ref.current) {
          return;
        }
        ref.current.style.display = "none";
      });
    });

    return (
      <div ref={ref} className={props.className}>
        {props.children}
      </div>
    );
  },
  () => false
);

export const Loading = React.memo(
  (props: { store: ScrollViewCore } & React.HTMLAttributes<HTMLDivElement>) => {
    const { store } = props;

    const ref = useRef<null | HTMLDivElement>(null);

    useInitialize(() => {
      store.inDownOffset(() => {
        // console.log("[]Loading - store.onInOffset", ref);
        if (!ref.current) {
          return;
        }
        ref.current.style.display = "none";
      });
      store.onPullToRefresh(() => {
        // console.log("[]Loading - store.onPullToRefresh", ref);
        if (!ref.current) {
          return;
        }
        ref.current.style.display = "inline-block";
      });
    });

    return (
      <div ref={ref} className={props.className} style={{ display: "none" }}>
        {props.children}
      </div>
    );
  },
  () => false
);
