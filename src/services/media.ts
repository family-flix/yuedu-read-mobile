import dayjs from "dayjs";

import { UnpackedRequestPayload, request } from "@/domains/request/utils";
import {
  MediaOriginCountry,
  MediaTypes,
  MovieMediaGenresTexts,
  MovieMediaOriginCountryTexts,
  SeasonMediaOriginCountryTexts,
} from "@/constants";
import { FetchParams } from "@/domains/list/typing";
import { ListResponse, ListResponseWithCursor, RequestedResource, Result } from "@/types";
import { relative_time_from_now } from "@/utils";

/**
 * 获取我的书架
 */
export function fetchNovelsInShelf(params: FetchParams & { keyword: string }) {
  const { page, pageSize, ...rest } = params;
  return request.post<
    ListResponse<{
      id: string;
      name: string;
      overview: string;
      cover_path: string;
      latest_chapter_name: string;
      latest_chapter_created: string;
      cur_chapter_name: string | null;
      updated: string | null;
      author: {
        id: string;
        name: string;
      };
    }>
  >("/api/v1/wechat/shelf/novel/list", {
    ...rest,
    page,
    page_size: pageSize,
  });
}
export function fetchNovelsInShelfProcess(
  r: Result<UnpackedRequestPayload<RequestedResource<typeof fetchNovelsInShelf>>>
) {
  if (r.error) {
    return Result.Err(r.error);
  }
  return Result.Ok({
    ...r.data,
    list: r.data.list.map((novel_profile) => {
      const {
        id,
        name,
        overview,
        cover_path,
        author,
        latest_chapter_created,
        latest_chapter_name,
        cur_chapter_name,
        updated,
      } = novel_profile;
      return {
        id,
        name,
        overview,
        cover_path,
        cur_chapter:
          updated && cur_chapter_name
            ? {
                name: cur_chapter_name,
                updated_at: `${relative_time_from_now(updated)}`,
              }
            : null,
        latest_chapter: {
          name: latest_chapter_name,
          created_at: relative_time_from_now(latest_chapter_created),
        },
        author,
      };
    }),
  });
}

/**
 * 获取电影列表
 */
export function fetchMediaList(params: FetchParams & { keyword: string }) {
  const { page, pageSize, ...rest } = params;
  return request.post<
    ListResponseWithCursor<{
      unique_id: string;
      name: string;
      overview: string;
      cover_path: string;
      author: {
        name: string;
      };
      in_production: number;
      latest_chapter: {
        name: string;
        updated_at: string;
      };
    }>
  >("/api/v1/wechat/search", {
    ...rest,
    page,
    page_size: pageSize,
  });
}
export function fetchMediaListProcess(r: Result<UnpackedRequestPayload<RequestedResource<typeof fetchMediaList>>>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  return Result.Ok({
    ...r.data,
    list: r.data.list.map((novel_profile) => {
      const { unique_id, name, overview, cover_path, author, in_production, latest_chapter } = novel_profile;
      return {
        unique_id,
        name,
        overview,
        cover_path,
        author,
        in_production,
        latest_chapter,
      };
    }),
  });
}
export type PartialNovelProfile = RequestedResource<typeof fetchMediaListProcess>["list"][0];

/** 搜索到的小说信息 */
export type SearchedPartialNovelProfile = {
  unique_id: string;
  name: string;
  overview: string;
  cover_path: string | null;
  author: {
    name: string;
  };
  in_production: number;
  latest_chapter: {
    name: string;
    updated_at: string;
  };
};

export function addToShelf(novel: SearchedPartialNovelProfile) {
  return request.post<
    ListResponseWithCursor<{
      unique_id: string;
      name: string;
      overview: string;
      cover_path: string;
      author: {
        name: string;
      };
      in_production: number;
      latest_chapter: {
        name: string;
        updated_at: string;
      };
    }>
  >("/api/v1/wechat/shelf/add_novel", novel);
}

export function fetchNovelChaptersAndProfile(novel: FetchParams & { id: string }) {
  return request.post<
    ListResponseWithCursor<{
      id: string;
      name: string;
      order: number;
      file_count: number;
    }>
  >("/api/v1/wechat/novel/chapters", novel);
}

export function fetchMemberToken(values: { media_id: string; target_member_id: string }) {
  const { media_id, target_member_id } = values;
  return request.post<{ name: string; original_name: string; poster_path: string; token: string }>(
    "/api/v2/wechat/member/token",
    {
      media_id,
      target_member_id,
    }
  );
}
