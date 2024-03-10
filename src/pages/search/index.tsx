/**
 * @file 电视剧列表
 */
import React, { useState } from "react";
import { ArrowUp, ChevronLeft, Loader, Pen, Search, SlidersHorizontal, Star, Trash } from "lucide-react";

import { ViewComponent, ViewComponentWithMenu } from "@/store/types";
import { PartialNovelProfile, addToShelf, fetchMediaList, fetchMediaListProcess } from "@/services/media";
import {
  Skeleton,
  ListView,
  Input,
  ScrollView,
  LazyImage,
  Sheet,
  CheckboxGroup,
  Button,
  Dialog,
} from "@/components/ui";
import { MediaRequestCore } from "@/components/media-request";
import { Affix } from "@/components/ui/affix";
import {
  ScrollViewCore,
  InputCore,
  DialogCore,
  CheckboxGroupCore,
  ButtonCore,
  ImageInListCore,
  ButtonInListCore,
} from "@/domains/ui";
import { AffixCore } from "@/domains/ui/affix";
import { ListCoreV2 } from "@/domains/list/v2";
import { RequestCoreV2 } from "@/domains/request/v2";
import { useInitialize, useInstance } from "@/hooks";
import { TVSourceOptions, TVGenresOptions, MediaTypes } from "@/constants";

export const MediaSearchPage: ViewComponent = React.memo((props) => {
  const { app, history, client, storage, view } = props;

  const seasonList = useInstance(
    () =>
      new ListCoreV2(new RequestCoreV2({ fetch: fetchMediaList, process: fetchMediaListProcess, client }), {
        pageSize: 20,
        beforeSearch() {
          searchInput.setLoading(true);
        },
        afterSearch() {
          searchInput.setLoading(false);
        },
      })
  );
  const addToShelfRequest = useInstance(() => new RequestCoreV2({ fetch: addToShelf, client }));
  const affix = useInstance(
    () =>
      new AffixCore({
        top: 0,
        defaultHeight: 56,
      })
  );
  const scrollView = useInstance(() => new ScrollViewCore({}));
  const settingsSheet = useInstance(() => new DialogCore());
  const poster = useInstance(() => new ImageInListCore());
  const searchInput = useInstance(
    () =>
      new InputCore({
        placeholder: "请输入关键字搜索",
        onEnter(v) {
          seasonList.search({
            keyword: v,
          });
          scrollView.scrollTo({ top: 0 });
        },
        onBlur(v) {
          seasonList.search({
            keyword: v,
          });
        },
        onClear() {
          setKeyword("");
          setShowPlaceholder(true);
          // console.log("[PAGE]home/index - onClear", helper, helper.response.search);
          // seasonList.search({
          //   name: "",
          // });
        },
        onMounted() {
          searchInput.focus();
        },
      })
  );
  const sourceCheckboxGroup = useInstance(() => {
    const { language = [] } = storage.get("tv_search");
    return new CheckboxGroupCore({
      values: TVSourceOptions.filter((opt) => {
        return language.includes(opt.value);
      }).map((opt) => opt.value),
      options: TVSourceOptions.map((opt) => {
        return {
          ...opt,
          checked: language.includes(opt.value),
        };
      }),
      onChange(options) {
        storage.merge("tv_search", {
          language: options,
        });
        // setHasSearch(!!options.length);
        seasonList.search({
          language: options.join("|"),
        });
      },
    });
  });
  const genresCheckboxGroup = useInstance(() => {
    // const { genres = [] } = app.cache.get("tv_search", {
    //   genres: [] as string[],
    // });
    return new CheckboxGroupCore({
      options: TVGenresOptions,
      onChange(options) {
        // app.cache.merge("tv_search", {
        //   genres: options,
        // });
        // setHasSearch(!!options.length);
        // settingsSheet.hide();
        seasonList.search({
          genres: options.join("|"),
        });
      },
    });
  });
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
  const addToShelfBtn = useInstance(
    () =>
      new ButtonInListCore<PartialNovelProfile>({
        async onClick(record) {
          if (!record) {
            app.tip({
              text: ["请选择添加的小说"],
            });
            return;
          }
          const r = await addToShelfRequest.run(record);
          if (r.error) {
            app.tip({
              text: ["添加失败", r.error.message],
            });
            return;
          }
          app.tip({
            text: ["添加成功"],
          });
        },
      })
  );

  const [response, setResponse] = useState(seasonList.response);
  const [keyword, setKeyword] = useState(searchInput.value);
  const [height, setHeight] = useState(affix.height);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [histories, setHistories] = useState(storage.values.media_search_histories);
  // const [hasSearch, setHasSearch] = useState(
  //   (() => {
  //     const { language = [] } = storage.get("tv_search");
  //     return language.length !== 0;
  //   })()
  // );

  useInitialize(() => {
    view.onShow(() => {
      app.setTitle(view.title);
    });
    // scrollView.onPullToRefresh(async () => {
    //   await seasonList.refresh();
    //   app.tip({
    //     text: ["刷新成功"],
    //   });
    //   scrollView.stopPullToRefresh();
    // });
    scrollView.onReachBottom(() => {
      seasonList.loadMore();
    });
    affix.onMounted((rect) => {
      setHeight(rect.height);
    });
    searchInput.onChange((v) => {
      setKeyword(v);
    });
    seasonList.onStateChange((nextResponse) => {
      setResponse(nextResponse);
    });
    seasonList.onAfterSearch(({ params }) => {
      const { name } = params as { name: string };
      if (name && !storage.values.media_search_histories.includes(name)) {
        storage.merge("media_search_histories", [name]);
      }
      setShowPlaceholder(false);
    });
    storage.onStateChange((v) => {
      setHistories(v.values.media_search_histories);
    });
    mediaRequest.onTip((msg) => {
      app.tip(msg);
    });
    // const search = (() => {
    //   const { language = [] } = storage.get("tv_search");
    //   if (!language.length) {
    //     return {};
    //   }
    //   return {
    //     language: language.join("|"),
    //   };
    // })();
  });

  const { dataSource } = response;

  // console.log("[PAGE]home - render", dataSource);

  return (
    <>
      <Affix store={affix} className="z-50 w-full bg-w-bg-0">
        <div className="flex items-center justify-between w-full py-2 px-4 text-w-fg-0 space-x-3">
          <div className="flex-1 w-0">
            <Input store={searchInput} prefix={<Search className="w-5 h-5" />} />
          </div>
          <div
            className="relative py-2 w-12 text-center"
            onClick={() => {
              if (searchInput.value) {
                seasonList.search({
                  name: searchInput.value,
                });
                return;
              }
              history.back();
            }}
          >
            {keyword ? "搜索" : "取消"}
          </div>
        </div>
      </Affix>
      {(() => {
        if (showPlaceholder) {
          return (
            <div className="absolute inset-0 box-border text-w-fg-1" style={{ top: height }}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="">搜索历史</div>
                  <div
                    onClick={() => {
                      storage.clear("media_search_histories");
                    }}
                  >
                    <Trash className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center flex-wrap mt-2 gap-2">
                  {histories.map((keyword) => {
                    return (
                      <div
                        key={keyword}
                        className="px-4 py-2 rounded-md text-sm bg-w-bg-2"
                        onClick={() => {
                          searchInput.change(keyword);
                          searchInput.enter();
                        }}
                      >
                        {keyword}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }
        return (
          <ScrollView store={scrollView} className="absolute inset-0 box-border text-w-fg-1" style={{ top: height }}>
            <ListView
              store={seasonList}
              className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 pt-4"
              extraEmpty={
                <div className="mt-2">
                  <Button store={mediaRequestBtn} variant="subtle">
                    提交想看的影视剧
                  </Button>
                </div>
              }
            >
              {(() => {
                return dataSource.map((novel_profile) => {
                  const { unique_id, name, overview, author, cover_path } = novel_profile;
                  return (
                    <div key={unique_id} className="flex px-3 mb-2 cursor-pointer">
                      <div className="relative w-[128px] h-[198px] mr-4 rounded-lg overflow-hidden">
                        <LazyImage className="w-full h-full object-cover" store={poster.bind(cover_path)} alt={name} />
                        <div className="absolute top-2 left-2"></div>
                      </div>
                      <div className="flex-1 max-w-full overflow-hidden">
                        <div className="flex items-center">
                          <h2 className="text-xl text-w-fg-0">{name}</h2>
                        </div>
                        <div className="break-all whitespace-pre-wrap truncate line-clamp-3">{overview}</div>
                        {author ? (
                          <div className="mt-2 text-sm overflow-hidden text-ellipsis break-keep whitespace-nowrap">
                            {author.name}
                          </div>
                        ) : null}
                        <div className="inline-block mt-4">
                          <Button variant="subtle" store={addToShelfBtn.bind(novel_profile)}>
                            加到书架
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </ListView>
            <div style={{ height: 1 }} />
          </ScrollView>
        );
      })()}
      <Sheet store={settingsSheet}>
        <div className="relative h-[320px] py-4 pb-8 px-2 overflow-y-auto">
          {response.loading && (
            <>
              <div className="absolute inset-0 bg-w-bg-0 opacity-50" />
              <div className="absolute w-full h-[120px] flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin" />
              </div>
            </>
          )}
          <div>
            <div>
              <CheckboxGroup store={sourceCheckboxGroup} />
            </div>
            <div>
              <CheckboxGroup store={genresCheckboxGroup} />
            </div>
          </div>
        </div>
      </Sheet>
      <Dialog store={mediaRequest.dialog}>
        <div className="text-w-fg-1">
          <p>输入想看的电视剧</p>
          <div className="mt-4">
            <Input prefix={<Pen className="w-4 h-4" />} store={mediaRequest.input} />
          </div>
        </div>
      </Dialog>
    </>
  );
});
