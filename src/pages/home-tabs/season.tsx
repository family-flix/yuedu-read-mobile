import React, { useState } from "react";
import { Star } from "lucide-react";

import { ViewComponent } from "@/store/types";
import { fetchNovelsInShelf, fetchNovelsInShelfProcess } from "@/services/media";
import { Button, LazyImage, ListView, ScrollView, Skeleton } from "@/components/ui";
import { MediaRequestCore } from "@/components/media-request";
import { ButtonCore, ImageInListCore, ScrollViewCore } from "@/domains/ui";
import { RequestCoreV2 } from "@/domains/request/v2";
import { ListCoreV2 } from "@/domains/list/v2";
import { useInitialize, useInstance } from "@/hooks";
import { MediaTypes } from "@/constants";
import { cn } from "@/utils";

export const HomeSeasonTabContent: ViewComponent = React.memo((props) => {
  const { app, client, history, view, storage } = props;

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
    os: app.env,
    onReachBottom() {
      list.loadMore();
    },
  });
  const image = useInstance(() => new ImageInListCore());
  const mediaRequest = useInstance(() => new MediaRequestCore({ client }));
  const mediaRequestBtn = useInstance(
    () =>
      new ButtonCore({
        onClick() {
          mediaRequest.dialog.show();
        },
      })
  );

  const [response, setResponse] = useState(list.response);
  const { dataSource } = response;

  useInitialize(() => {
    list.onStateChange((v) => {
      setResponse(v);
    });
    list.init({ language: view.query.language });
  });

  return (
    <>
      <ScrollView className="bg-w-bg-3" store={scroll}>
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
                提交想看的电视剧
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
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </ListView>
      </ScrollView>
    </>
  );
});
