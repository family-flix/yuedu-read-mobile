/**
 * @file 电视剧播放页面
 */
import React, { useMemo, useState } from "react";
import { ArrowLeft, Layers, Loader, Settings, SkipForward } from "lucide-react";

import { GlobalStorageValues, ViewComponent } from "@/store/types";
import { Show } from "@/packages/ui/show";
import { Sheet, ScrollView, Video, ListView } from "@/components/ui";
import { Presence } from "@/components/ui/presence";
import { PlayingIcon } from "@/components/playing";
import { SeasonMediaSettings } from "@/components/season-media-settings";
import { DynamicContent } from "@/components/dynamic-content";
import { ScrollViewCore, DialogCore, PresenceCore } from "@/domains/ui";
import { NovelReaderCore } from "@/domains/media/season";
import { MediaResolutionTypes } from "@/domains/source/constants";
import { RefCore } from "@/domains/cur";
import { PlayerCore } from "@/domains/player";
import { createVVTSubtitle } from "@/domains/subtitle/utils";
import { Application, OrientationTypes } from "@/domains/app";
import { RouteViewCore } from "@/domains/route_view";
import { DynamicContentCore, DynamicContentInListCore } from "@/domains/ui/dynamic-content";
import { StorageCore } from "@/domains/storage";
import { HttpClientCore } from "@/domains/http_client";
import { useInitialize, useInstance } from "@/hooks";
import { cn, seconds_to_hour } from "@/utils";

class SeasonPlayingPageLogic<
  P extends { app: Application; client: HttpClientCore; storage: StorageCore<GlobalStorageValues> }
> {
  $app: P["app"];
  $storage: P["storage"];
  $client: P["client"];
  $tv: NovelReaderCore;
  $settings: RefCore<{
    volume: number;
    rate: number;
    type: MediaResolutionTypes;
  }>;

  settings: {
    volume: number;
    rate: number;
    type: MediaResolutionTypes;
  };

  constructor(props: P) {
    const { app, storage, client } = props;

    this.$app = app;
    this.$storage = storage;
    this.$client = client;

    const settings = storage.get("player_settings");
    this.settings = settings;
    this.$settings = new RefCore({
      value: settings,
    });
    const { type: resolution, volume, rate } = settings;
    const novel = new NovelReaderCore({
      client,
    });
    this.$tv = novel;
    console.log("[PAGE]play - useInitialize");
    novel.onProfileLoaded((profile) => {
      app.setTitle(novel.getTitle().join(" - "));
      const { curSource: curEpisode } = profile;
      // const episodeIndex = tv.curGroup ? tv.curGroup.list.findIndex((e) => e.id === curEpisode.id) : -1;
      // console.log("[PAGE]play - tv.onProfileLoaded", curEpisode.name, episodeIndex);
      // const EPISODE_CARD_WIDTH = 120;
      // if (episodeIndex !== -1) {
      //   episodeView.scrollTo({ left: episodeIndex * (EPISODE_CARD_WIDTH + 8) });
      // }
      novel.playEpisode(curEpisode, { currentTime: curEpisode.currentTime ?? 0 });
      // bottomOperation.show();
    });
    novel.onEpisodeChange((curEpisode) => {
      app.setTitle(novel.getTitle().join(" - "));
      const { currentTime } = curEpisode;
    });
    novel.onTip((msg) => {
      app.tip(msg);
    });
    novel.onSourceFileChange((mediaSource) => {
      console.log("[PAGE]play - tv.onSourceChange", mediaSource.progress);
    });
  }
}
class SeasonPlayingPageView {
  $view: RouteViewCore;
  $scroll = new ScrollViewCore({});

  $mask = new PresenceCore({ mounted: true, open: true });
  $top = new PresenceCore({ mounted: true, open: true });
  $bottom = new PresenceCore({ mounted: true, open: true });
  $control = new PresenceCore({ mounted: true, open: true });
  $time = new PresenceCore({});
  $subtitle = new PresenceCore({});
  $settings = new DialogCore();
  $episodes = new DialogCore();
  $episodeView = new ScrollViewCore();
  $nextEpisode = new DynamicContentCore({
    value: 1,
  });
  $icon = new DynamicContentCore({
    value: 1,
  });

  $episode = new DynamicContentInListCore({
    value: 1,
  });

  visible = true;
  timer: null | NodeJS.Timeout = null;

  constructor(props: { view: RouteViewCore }) {
    const { view } = props;
    this.$view = view;
  }

  show() {
    this.$top.show();
    this.$bottom.show();
    this.$control.show();
    this.$mask.show();
    this.visible = true;
  }
  hide() {
    this.$top.hide();
    this.$bottom.hide();
    this.$control.hide();
    this.$mask.hide();
    this.visible = false;
  }
  toggle() {
    this.$top.toggle();
    this.$bottom.toggle();
    this.$control.toggle();
    this.$mask.toggle();
    this.visible = !this.visible;
  }
  attemptToShow() {
    if (this.timer !== null) {
      this.hide();
      clearTimeout(this.timer);
      this.timer = null;
      return false;
    }
    this.show();
    return true;
  }
  prepareHide() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.timer = setTimeout(() => {
      this.hide();
      this.timer = null;
    }, 5000);
  }
  prepareToggle() {
    if (this.timer === null) {
      this.toggle();
      return;
    }
    clearTimeout(this.timer);
    this.toggle();
  }
  stopHide() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const SeasonPlayingPageV2: ViewComponent = React.memo((props) => {
  const { app, client, history, storage, view } = props;

  const $logic = useInstance(() => new SeasonPlayingPageLogic({ app, client, storage }));
  const $page = useInstance(() => new SeasonPlayingPageView({ view }));

  const [state, setProfile] = useState($logic.$tv.state);

  useInitialize(() => {
    $logic.$tv.onStateChange((v) => {
      setProfile(v);
    });
    $logic.$tv.fetchProfile(view.query.id);
  });

  // console.log("[PAGE]TVPlayingPage - render", tvId);

  // if (error) {
  //   return (
  //     <div className="w-full h-[100vh]">
  //       <div className="center text-center">{error}</div>
  //     </div>
  //   );
  // }

  return (
    <>
      <ScrollView
        store={$page.$scroll}
        className="bg-w-bg-0"
        contentClassName="pt-12 pb-24 space-y-2"
        onClick={() => {
          $page.prepareToggle();
        }}
      >
        {(() => {
          if (!state.curSource) {
            return null;
          }
          const lines = state.curSource.curFile.content;
          return lines.map((line, i) => {
            return (
              <div key={i} className="px-4">
                <div className="indent-4 text-lg">{line}</div>
              </div>
            );
          });
        })()}
        <div className="">
          <div
            className="fixed top-0 z-40 w-full"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <Presence
              store={$page.$top}
              className={cn(
                "flex items-center justify-between bg-w-bg-0",
                "animate-in fade-in slide-in-from-top",
                "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=closed]:fade-out"
              )}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="flex items-center">
                <div
                  className="inline-block p-4"
                  onClick={() => {
                    history.back();
                  }}
                >
                  <ArrowLeft className="w-6 h-6" />
                </div>
                <Show when={!!state.curSource}>
                  <div className="max-w-[248px] truncate break-all">{state.curSource?.name}</div>
                </Show>
              </div>
            </Presence>
          </div>
          <div
            className="fixed bottom-0 z-40 w-full safe-bottom"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Presence
              className={cn(
                "animate-in fade-in slide-in-from-bottom bg-w-bg-0",
                "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:fade-out"
              )}
              store={$page.$bottom}
            >
              <div
                className="flex items-center flex-reverse space-x-4 w-full px-2 py-4"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <div
                  className="flex items-center p-2 rounded-md space-x-2"
                  onClick={() => {
                    $page.$episodes.show();
                  }}
                >
                  <Layers className="w-6 h-6" />
                  <div className="">选集</div>
                </div>
                <div
                  className="relative p-2 rounded-md space-x-2"
                  onClick={async () => {
                    $page.$nextEpisode.set(2);
                    await $logic.$tv.playNextEpisode();
                    $logic.$tv.updatePlayProgressForce();
                    $page.$scroll.scrollTo({ top: 0 });
                    $page.$nextEpisode.set(1);
                  }}
                >
                  <DynamicContent
                    store={$page.$nextEpisode}
                    options={[
                      {
                        value: 1,
                        content: <SkipForward className="w-6 h-6" />,
                      },
                      {
                        value: 2,
                        content: (
                          <div>
                            <Loader className="w-6 h-6 animate animate-spin" />
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
                <div
                  className="relative p-2 rounded-md"
                  onClick={() => {
                    $page.$settings.show();
                  }}
                >
                  <Settings className="w-6 h-6" />
                </div>
              </div>
            </Presence>
          </div>
        </div>
      </ScrollView>
      <Sheet store={$page.$episodes} className="" size="lg">
        {(() => {
          if (state.profile === null) {
            return <div>Loading</div>;
          }
          return (
            <ScrollView store={$page.$episodeView} className="relative">
              <ListView store={$logic.$tv.$chapters} className="px-4 space-y-2 pb-24" wrapClassName="h-full">
                {state.chapters.map((chapter) => {
                  const { id, name, order } = chapter;
                  return (
                    <div
                      key={id}
                      className={cn("relative flex items-center px-2", {})}
                      onClick={async () => {
                        // 这种情况是缺少了该集，但仍返回了 order 用于提示用户「这里本该有一集，但缺少了」
                        if (!id) {
                          app.tip({
                            text: ["该集无法播放，请反馈后等待处理"],
                          });
                          return;
                        }
                        $page.$episode.select(id);
                        $page.$episode.set(2);
                        await $logic.$tv.switchEpisode(chapter);
                        $page.$episodes.hide();
                        await $logic.$tv.updatePlayProgressForce();
                        $page.$episode.set(1);
                        $page.$episode.clear();
                      }}
                    >
                      {!id ? (
                        <div className="opacity-20">{order}</div>
                      ) : (
                        <DynamicContent
                          store={$page.$episode.bind(id)}
                          options={[
                            {
                              value: 1,
                              content: (
                                <Show
                                  when={state.curSource?.id === id}
                                  fallback={
                                    <div className="flex items-center">
                                      <div className="">{name}</div>
                                    </div>
                                  }
                                >
                                  <div className="flex items-center">
                                    <div className="text-w-brand">{name}</div>
                                  </div>
                                </Show>
                              ),
                            },
                            {
                              value: 2,
                              content: (
                                <div>
                                  <Loader className="w-5 h-5 animate animate-spin" />
                                </div>
                              ),
                            },
                          ]}
                        />
                      )}
                    </div>
                  );
                })}
              </ListView>
            </ScrollView>
          );
        })()}
      </Sheet>
    </>
  );
});
