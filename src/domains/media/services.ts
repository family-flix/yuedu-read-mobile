import dayjs from "dayjs";

import { request, TmpRequestResp } from "@/domains/request/utils";
import { FetchParams } from "@/domains/list/typing";
import { SubtitleFileResp } from "@/domains/subtitle/types";
import { MediaResolutionTypes, MediaResolutionTypeTexts } from "@/domains/source/constants";
import { ListResponse, ListResponseWithCursor, RequestedResource, Result, Unpacked, UnpackedResult } from "@/types";
import { MediaTypes, MediaOriginCountry, SeasonGenresTexts, SeasonMediaOriginCountryTexts } from "@/constants";
import { episode_to_chinese_num, minute_to_hour2, relative_time_from_now } from "@/utils";

/**
 * 获取季列表
 */
export function fetchSeasonList(params: FetchParams & { name: string }) {
  const { page, pageSize, ...rest } = params;
  return request.post<
    ListResponse<{
      id: string;
      type: MediaTypes;
      name: string;
      poster_path: string;
      overview: string;
      season_number: string;
      air_date: string;
      genres: {
        value: number;
        label: string;
      }[];
      origin_country: string[];
      vote_average: number;
      episode_count: string;
      cur_episode_count: string;
      actors: {
        id: string;
        name: string;
      }[];
    }>
  >("/api/v2/wechat/season/list", {
    ...rest,
    page,
    page_size: pageSize,
  });
}
export function fetchSeasonListProcess(r: TmpRequestResp<typeof fetchSeasonList>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  return Result.Ok({
    ...r.data,
    list: r.data.list.map((season) => {
      const {
        id,
        type,
        name,
        overview,
        poster_path,
        vote_average,
        air_date,
        genres,
        origin_country,
        episode_count,
        cur_episode_count,
        actors = [],
      } = season;
      return {
        id,
        type,
        name,
        // season_text: season_to_chinese_num(season_text),
        air_date: dayjs(air_date).year(),
        episode_count,
        cur_episode_count,
        episode_count_text: (() => {
          if (!episode_count) {
            return null;
          }
          if (cur_episode_count === episode_count) {
            return `全${episode_count}集`;
          }
          return `更新至${cur_episode_count}集`;
        })(),
        overview,
        poster_path,
        vote: (() => {
          if (!vote_average) {
            return "N/A";
          }
          return vote_average.toFixed(1);
        })(),
        origin_country: origin_country
          .map((country) => {
            return SeasonMediaOriginCountryTexts[country as MediaOriginCountry];
          })
          .filter(Boolean),
        genres: genres
          .map((g) => {
            return SeasonGenresTexts[g.label];
          })
          .filter(Boolean),
        actors: actors.map((actor) => actor.name).join(" / "),
      };
    }),
  });
}
export type SeasonItem = UnpackedResult<TmpRequestResp<typeof fetchSeasonListProcess>>["list"][0];

type MediaSourceProfileRes = {
  id: string;
  file_name: string;
  parent_paths: string;
  drive: {
    id: string;
    name: string;
    avatar: string;
  };
};
type CurSeasonEpisodeResp = {
  id: string;
  media_id: string;
  name: string;
  overview: string;
  order: number;
  air_date: string;
  runtime: number;
  still_path: string;
  current_time: number;
  cur_source_file_id: string;
  thumbnail_path: string;
};
type NovelChapterResp = {
  id: string;
  name: string;
  order: number;
  // progress: number;
  files: {
    id: string;
    name: string;
    // content: string;
  }[];
};
type NovelAndCurChapterResp = {
  id: string;
  name: string;
  overview: string;
  cover_path: string;
  cur_chapter: NovelChapterResp & { progress: number };
  // source_count: number;
  chapters: NovelChapterResp[];
  next_marker: string;
};
/**
 * 获取电视剧及当前播放的剧集详情
 * @param body
 */
export function fetchMediaPlayingEpisode(body: { novel_id: string }) {
  return request.post<NovelAndCurChapterResp>("/api/v1/wechat/novel/cur_chapter", {
    novel_id: body.novel_id,
  });
}
export function fetchMediaPlayingEpisodeProcess(r: TmpRequestResp<typeof fetchMediaPlayingEpisode>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  const { id, name, overview, cover_path, cur_chapter, chapters, next_marker } = r.data;
  const processedChapters = chapters.map((chapter) => {
    const { id, name, order, files } = chapter;
    return {
      id,
      name,
      order,
      files: files.map((file) => {
        const { id, name } = file;
        return {
          id,
          name,
          // content: content.split("\n"),
        };
      }),
    };
  });
  const matched = processedChapters.find((chapter) => chapter.id === cur_chapter.id);
  const curChapter = (() => {
    if (matched) {
      return {
        ...matched,
        currentTime: cur_chapter.progress,
        curFile: matched.files[0],
      };
    }
    const first = processedChapters[0];
    if (!first) {
      return null;
    }
    return {
      ...first,
      currentTime: 0,
      curFile: first.files[0],
    };
  })();
  return Result.Ok({
    id,
    name,
    overview,
    coverPath: cover_path,
    curChapter,
    chapterCount: 0,
    chapters: processedChapters,
    next_marker,
  });
}

/** 电视剧详情 */
export type MediaAndCurSource = RequestedResource<typeof fetchMediaPlayingEpisodeProcess>;
export type SeasonProfile = RequestedResource<typeof fetchMediaPlayingEpisodeProcess>;
// export type SeasonEpisodeGroup = RequestedResource<typeof fetchMediaPlayingEpisodeProcess>["sourceGroups"][number];
/** 剧集 */
// export type MediaSource = SeasonEpisodeGroup["list"][number];
export type NovelChapter = {
  id: string;
  name: string;
  order: number;
  files: {
    id: string;
    name: string;
    // content: string[];
  }[];
};
export type CurNovelChapter = NovelChapter & {
  progress: number;
  curFile: {
    id: string;
    name: string;
    content: string[];
  };
};
export function fetchChapters(body: { novel_id: string; next_marker?: string }) {
  const { novel_id, next_marker } = body;
  return request.post<ListResponseWithCursor<NovelChapterResp>>("/api/v1/wechat/novel/chapters", {
    novel_id,
    next_marker,
  });
}
export function fetchChaptersProcess(r: TmpRequestResp<typeof fetchChapters>) {
  if (r.error) {
    return Result.Err(r.error.message);
  }
  return Result.Ok({
    next_marker: r.data.next_marker,
    list: r.data.list.map((chapter) => {
      const { id, name, order, files } = chapter;
      return {
        id,
        name,
        order,
        files: files.map((file) => {
          const { id, name } = file;
          return {
            id,
            name,
            // content: content.split("\n"),
          };
        }),
      };
    }),
  });
}

/**
 * 获取视频源播放信息
 */
export function fetchSourcePlayingInfo(body: { file_id: string }) {
  const { file_id } = body;
  return request.post<{
    id: string;
    name: string;
    content: string;
  }>("/api/v1/wechat/novel/file", {
    file_id,
  });
}
export function fetchSourcePlayingInfoProcess(r: TmpRequestResp<typeof fetchSourcePlayingInfo>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  const { id, name, content } = r.data;
  return Result.Ok({
    id,
    name,
    content: content.split("\n"),
  });
}
export type NovelChapterSourceFile = RequestedResource<typeof fetchSourcePlayingInfoProcess>;

/**
 * 更新播放记录
 */
export function updatePlayHistory(body: {
  novel_id: string;
  novel_chapter_id: string;
  progress: number;
  duration?: number;
  file_id: string;
}) {
  const { novel_id, novel_chapter_id, progress, duration, file_id } = body;
  return request.post<null>("/api/v1/wechat/history/update", {
    novel_id,
    novel_chapter_id,
    progress,
    duration,
    file_id,
  });
}

/**
 * 获取当前用户影片播放记录
 * @param params
 * @returns
 */
export function fetchPlayingHistories(params: FetchParams) {
  const { page, pageSize, ...rest } = params;
  return request.post<
    ListResponseWithCursor<{
      id: string;
      type: MediaTypes;
      /** 电视剧名称 */
      name: string;
      /** 电视剧海报地址 */
      poster_path: string;
      media_id: string;
      thumbnail_path: string;
      /** 该剧集当前季总集数 */
      episode_count: number;
      /** 当前集数 */
      cur_episode_number: number;
      cur_episode_count: number;
      /** 播放记录当前集进度 */
      current_time: number;
      /** 该集总时长 */
      duration: number;
      /** 播放记录更新时间 */
      updated: string;
      /** 首播日期 */
      air_date: string;
      /** 看过后是否有更新 */
      has_update: number;
    }>
  >("/api/v2/wechat/history/list", {
    ...rest,
    page,
    page_size: pageSize,
  });
}
export function fetchPlayingHistoriesProcess(r: TmpRequestResp<typeof fetchPlayingHistories>) {
  if (r.error) {
    return r;
  }
  const { list, total, page_size, next_marker } = r.data;
  return Result.Ok({
    page_size,
    total,
    next_marker,
    list: list.map((history) => {
      const {
        id,
        type,
        media_id,
        name,
        poster_path,
        has_update,
        episode_count,
        cur_episode_number,
        cur_episode_count,
        thumbnail_path,
        duration,
        current_time,
        air_date,
        updated,
      } = history;
      return {
        id,
        type,
        media_id,
        name,
        posterPath: poster_path,
        episodeCountText: (() => {
          if (type === MediaTypes.Movie) {
            return null;
          }
          if (!episode_count) {
            return null;
          }
          if (cur_episode_count === episode_count) {
            return `全${episode_count}集`;
          }
          return `更新至${cur_episode_count}集`;
        })(),
        episodeText: type === MediaTypes.Movie ? null : episode_to_chinese_num(cur_episode_number),
        hasUpdate: !!has_update,
        airDate: air_date,
        currentTime: current_time,
        percent: current_time === 0 || duration === 0 ? 0 : parseFloat(((current_time / duration) * 100).toFixed(0)),
        updated: relative_time_from_now(updated),
        thumbnail_path,
      };
    }),
  });
}
export type PlayHistoryItem = UnpackedResult<TmpRequestResp<typeof fetchPlayingHistoriesProcess>>["list"][number];

export function deleteHistory(body: { history_id: string }) {
  return request.post(`/api/v2/wechat/history/delete`, {
    history_id: body.history_id,
  });
}

export async function fetchMediaSeries(body: { media_id: string }) {
  const r = await request.post<
    ListResponseWithCursor<{
      id: string;
      name: string;
      poster_path: string;
    }>
  >("/api/v2/wechat/media/series", {
    media_id: body.media_id,
  });
  return r;
}
