/**
 * @file 首页
 */
import React, { useState } from "react";
import { ArrowUp, Bell, Bird, Search, User } from "lucide-react";

import { messageList } from "@/store/index";
import { ViewComponentWithMenu } from "@/store/types";
import { PageKeys } from "@/store/routes";
import { fetchNovelsInShelf, fetchNovelsInShelfProcess } from "@/services/media";
import {
  fetchCollectionList,
  fetchCollectionListProcess,
  fetchUpdatedMediaToday,
  fetchUpdatedMediaTodayProcess,
} from "@/services";
import { Input, KeepAliveRouteView } from "@/components/ui";
import { StackRouteView } from "@/components/ui/stack-route-view";
import { Affix } from "@/components/ui/affix";
import { MediaRequestCore } from "@/components/media-request";
import { Show } from "@/components/ui/show";
import { TabHeader } from "@/components/ui/tab-header";
import { TabHeaderCore } from "@/domains/ui/tab-header";
import { ScrollViewCore, InputCore, ButtonCore, DialogCore, ImageInListCore } from "@/domains/ui";
import { fetchPlayingHistories } from "@/domains/media/services";
import { AffixCore } from "@/domains/ui/affix";
import { RequestCoreV2 } from "@/domains/request/v2";
import { ListCoreV2 } from "@/domains/list/v2";
import { useInitialize, useInstance } from "@/hooks";
import { Button, LazyImage, ListView, ScrollView, Skeleton } from "@/components/ui";
import { MediaTypes } from "@/constants";
import { cn } from "@/utils";
import { MediaOriginCountry } from "@/constants";

export const HomeIndexPage: ViewComponentWithMenu = React.memo((props) => {
  const { app, history, client, storage, pages, view, menu } = props;

  const collectionList = useInstance(
    () =>
      new ListCoreV2(
        new RequestCoreV2({
          fetch: fetchCollectionList,
          process: fetchCollectionListProcess,
          client,
        }),
        {
          pageSize: 6,
          onLoadingChange(loading) {
            searchInput.setLoading(!collectionList.response.initial && loading);
          },
        }
      )
  );
  const updatedMediaList = useInstance(
    () =>
      new RequestCoreV2({
        fetch: fetchUpdatedMediaToday,
        process: fetchUpdatedMediaTodayProcess,
        client: client,
      })
  );
  const historyList = useInstance(
    () =>
      new ListCoreV2(
        new RequestCoreV2({
          fetch: fetchPlayingHistories,
          client: client,
        }),
        {
          pageSize: 12,
        }
      )
  );
  const scrollView = useInstance(
    () =>
      new ScrollViewCore({
        _name: "1",
        onScroll(pos) {
          affix.handleScroll(pos);
          if (!menu) {
            return;
          }
          if (pos.scrollTop > app.screen.height) {
            menu.setCanTop({
              icon: <ArrowUp className="w-6 h-6" />,
              text: "回到顶部",
            });
            return;
          }
          if (pos.scrollTop === 0) {
            menu.setCanRefresh();
            return;
          }
          menu.disable();
        },
        // async onPullToRefresh() {
        //   updatedMediaList.reload();
        //   historyList.refresh();
        //   await collectionList.refresh();
        //   app.tip({
        //     text: ["刷新成功"],
        //   });
        //   scrollView.stopPullToRefresh();
        // },
        onReachBottom() {
          collectionList.loadMore();
        },
      })
  );
  const scrollView2 = useInstance(() => {
    return new ScrollViewCore({
      onReachBottom() {
        // ...
      },
    });
  });
  const tab = useInstance(
    () =>
      new TabHeaderCore<{
        key: "id";
        options: {
          id: string;
          name: PageKeys;
          text: string;
          query: Record<string, string>;
        }[];
      }>({
        key: "id",
        options: [
          {
            id: "recommended",
            name: "root.home_layout.home_index.home_index_recommended",
            text: "推荐",
            query: {},
          },
          {
            id: "history",
            name: "root.home_layout.home_index.home_index_history",
            text: "观看记录",
            query: {},
          },
          {
            id: "china",
            name: "root.home_layout.home_index.home_index_season",
            text: "电视剧",
            query: {
              language: MediaOriginCountry.CN,
            },
          },
          // {
          //   id: "animate",
          //   text: "动漫",
          // },
          // {
          //   id: "zongyi",
          //   text: "综艺",
          // },
          {
            id: "korean",
            name: "root.home_layout.home_index.home_index_season",
            text: "韩剧",
            query: {
              language: MediaOriginCountry.KR,
            },
          },
          {
            id: "jp",
            name: "root.home_layout.home_index.home_index_season",
            text: "日剧",
            query: {
              language: MediaOriginCountry.JP,
            },
          },
          {
            id: "us",
            name: "root.home_layout.home_index.home_index_season",
            text: "美剧",
            query: {
              language: MediaOriginCountry.US,
            },
          },
        ],
        onChange(value) {
          const { name, query } = value;
          history.push(name, query);
        },
        onMounted() {
          console.log("[PAGE]home/index - tab-header onMounted", history.$router.query);
          const key = history.$router.query.key;
          if (!key) {
            tab.selectById("china", { ignore: true });
            return;
          }
          tab.selectById(key, { ignore: true });
        },
      })
  );
  const searchInput = useInstance(
    () =>
      new InputCore({
        placeholder: "请输入关键字搜索",
      })
  );
  const dialog = useInstance(
    () =>
      new DialogCore({
        onOk() {
          window.location.reload();
        },
      })
  );
  const mediaRequest = useInstance(() => new MediaRequestCore({ client }));
  const mediaRequestBtn = useInstance(
    () =>
      new ButtonCore({
        onClick() {
          mediaRequest.input.change(searchInput.value);
          mediaRequest.dialog.show();
        },
      })
  );
  const affix = useInstance(
    () =>
      new AffixCore({
        top: 0,
        defaultHeight: 96,
      })
  );

  const list = useInstance(
    () =>
      new ListCoreV2(
        new RequestCoreV2({
          fetch: fetchNovelsInShelf,
          process: fetchNovelsInShelfProcess,
          client,
        }),
        {
          pageSize: 20,
          search: {
            type: MediaTypes.Season,
          },
        }
      )
  );
  const scroll = new ScrollViewCore({
    _name: "inner",
    onReachBottom() {
      list.loadMore();
    },
  });
  const image = useInstance(() => new ImageInListCore());

  const [subViews, setSubViews] = useState(view.subViews);
  const [messageResponse, setMessageResponse] = useState(messageList.response);
  const [response, setResponse] = useState(list.response);
  const { dataSource } = response;
  // const [updatedMediaListState, setUpdatedMediaListState] = useState(updatedMediaList.response);
  // const [historyState, setHistoryState] = useState(historyList.response);
  const [height, setHeight] = useState(affix.height);
  // const [hasSearch, setHasSearch] = useState(
  //   (() => {
  //     const { language = [] } = storage.get("tv_search");
  //     return language.length !== 0;
  //   })()
  // );

  // const [history_response] = useState(history_helper.response);
  useInitialize(() => {
    view.onShow(() => {
      app.setTitle(view.title);
    });
    view.onSubViewsChange((nextSubViews) => {
      setSubViews(nextSubViews);
    });
    history.onRouteChange(({ href, query }) => {
      const { key } = query;
      if (!tab.mounted) {
        return;
      }
      console.log("[PAGE]home/index - history.onRouteChange", href, query);
      tab.handleChangeById(key);
    });
    affix.onMounted(({ height }) => {
      setHeight(height);
    });
    const search = (() => {
      const { language = [] } = storage.get("tv_search", { language: [] });
      if (!language.length) {
        return {};
      }
      return {
        language: language.join("|"),
      };
    })();
    if (menu) {
      menu.onScrollToTop(() => {
        scrollView.scrollTo({ top: 0 });
      });
      menu.onRefresh(async () => {
        scrollView.startPullToRefresh();
        collectionList.init(search);
        historyList.init();
        updatedMediaList.run().then(() => {
          scrollView.stopPullToRefresh();
        });
      });
    }
    messageList.onStateChange((nextState) => {
      setMessageResponse(nextState);
    });
    list.onStateChange((v) => {
      setResponse(v);
    });
    list.init({ language: view.query.language });
    // collectionList.onStateChange((nextResponse) => {
    //   setResponse(nextResponse);
    // });
    // updatedMediaList.onSuccess((nextState) => {
    //   setUpdatedMediaListState(nextState);
    // });
    // historyList.onStateChange((nextState) => {
    //   setHistoryState(nextState);
    // });
    // mediaRequest.onTip((msg) => {
    //   app.tip(msg);
    // });
    // collectionList.init(search);
    // updatedMediaList.run();
    // historyList.init();
  });

  // const { dataSource } = response;

  // console.log("[PAGE]home - render", dataSource);

  return (
    <>
      <div className="z-10">
        <Affix store={affix} className="z-50 w-full bg-w-bg-0">
          <div className="flex items-center justify-between w-full py-2 px-4 text-w-fg-0 space-x-4">
            <div className="relative flex-1 w-0">
              <Input store={searchInput} prefix={<Search className="w-5 h-5" />} />
              <div
                className="absolute z-10 inset-0"
                onClick={() => {
                  // app.showView(mediaSearchPage);
                  history.push("root.search");
                }}
              ></div>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className="relative"
                onClick={() => {
                  history.push("root.messages");
                  // app.showView(messagesPage);
                  // app.tip({
                  //   text: ["测试消息"],
                  // });
                }}
              >
                <Bell className="w-6 h-6" />
                <Show when={!!messageResponse.total}>
                  <div
                    className="absolute top-[-6px] right-0 px-[8px] h-[16px] rounded-xl break-all whitespace-nowrap text-[12px] border-w-bg-0 dark:border-w-fg-0 bg-w-red text-w-bg-0 dark:text-w-fg-0 translate-x-1/2"
                    style={{
                      lineHeight: "16px",
                    }}
                  >
                    {messageResponse.total}
                  </div>
                </Show>
              </div>
              <div
                className="relative"
                onClick={() => {
                  history.push("root.mine");
                  // app.showView(homeMinePage);
                }}
              >
                <User className="w-6 h-6" />
              </div>
            </div>
          </div>
        </Affix>
        <div className="absolute inset-0 flex flex-col" style={{ top: height }}>
          <ScrollView store={scroll}>
            <ListView
              store={list}
              className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 pt-4"
              skeleton={
                <>
                  <div className="flex px-3 pb-3 cursor-pointer">
                    <div className="relative w-[128px] h-[198px] mr-4">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="mt-2 flex-1 max-w-full overflow-hidden text-ellipsis">
                      <Skeleton className="w-full h-[32px]"></Skeleton>
                      <Skeleton className="mt-1 w-24 h-[24px]"></Skeleton>
                      <Skeleton className="mt-2 w-32 h-[22px]"></Skeleton>
                    </div>
                  </div>
                  <div className="flex px-3 pb-3 cursor-pointer">
                    <div className="relative w-[128px] h-[198px] mr-4">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="mt-2 flex-1 max-w-full overflow-hidden text-ellipsis">
                      <Skeleton className="w-full h-[32px]"></Skeleton>
                      <Skeleton className="mt-1 w-24 h-[24px]"></Skeleton>
                      <Skeleton className="mt-2 w-32 h-[22px]"></Skeleton>
                    </div>
                  </div>
                </>
              }
              extraEmpty={
                <div className="mt-2">
                  <Button store={mediaRequestBtn} variant="subtle">
                    提交想看的小说
                  </Button>
                </div>
              }
            >
              {(() => {
                return dataSource.map((season) => {
                  const { id, name, cover_path, author, latest_chapter, cur_chapter } = season;
                  return (
                    <div
                      key={id}
                      className="flex px-3 pb-3 cursor-pointer"
                      onClick={() => {
                        history.push("root.season_playing", { id });
                      }}
                    >
                      <div className="relative w-[86px] mr-4 rounded-lg overflow-hidden">
                        <LazyImage className="w-full h-full object-cover" store={image.bind(cover_path)} alt={name} />
                      </div>
                      <div className="flex-1 max-w-full overflow-hidden">
                        <div className="flex items-center">
                          <h2 className="text-xl text-w-fg-0">{name}</h2>
                        </div>
                        {author ? (
                          <div className="mt-1 text-sm overflow-hidden text-ellipsis break-keep whitespace-nowrap">
                            {author.name}
                          </div>
                        ) : null}
                        {cur_chapter ? (
                          <div
                            className="flex items-center mt-4 text-sm whitespace-nowrap"
                            style={{ fontSize: 12, lineHeight: "12px" }}
                          >
                            <div>{cur_chapter.updated_at}</div>
                            <p className="mx-2 ">读到</p>
                            <div>{cur_chapter.name}</div>
                          </div>
                        ) : null}
                        <div
                          className="flex items-center mt-2 text-sm whitespace-nowrap"
                          style={{ fontSize: 12, lineHeight: "12px" }}
                        >
                          <p className="mr-2">最新</p>
                          <div>{latest_chapter.name}</div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </ListView>
          </ScrollView>
        </div>
      </div>
    </>
  );
});
