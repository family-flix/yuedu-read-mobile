/**
 * @file 电视剧
 */
import { BaseDomain, Handler } from "@/domains/base";
import { NovelChapterSourceFileCore } from "@/domains/source";
import { RequestCoreV2 } from "@/domains/request/v2";
import { MediaResolutionTypes } from "@/domains/source/constants";
import { HttpClientCore } from "@/domains/http_client";
import { ListCoreV2 } from "@/domains/list/v2";
import { debounce } from "@/utils/lodash/debounce";
import { Result } from "@/types";

import {
  NovelChapter,
  NovelChapterSourceFile,
  updatePlayHistory,
  fetchMediaPlayingEpisode,
  fetchChapters,
  CurNovelChapter,
  fetchMediaSeries,
  fetchMediaPlayingEpisodeProcess,
  fetchChaptersProcess,
} from "./services";

enum Events {
  /** 电视剧详情加载完成 */
  ProfileLoaded,
  /** 切换播放的剧集 */
  EpisodeChange,
  /** 剧集列表改变 */
  EpisodesChange,
  /** 切换视频文件 */
  SourceFileChange,
  BeforeNextEpisode,
  BeforePrevEpisode,
  BeforeChangeSource,
  StateChange,
}
type TheTypesOfEvents = {
  [Events.ProfileLoaded]: {
    profile: NonNullable<SeasonCoreState["profile"]>;
    curSource: NonNullable<NovelChapter> & { currentTime: number };
  };
  [Events.SourceFileChange]: CurNovelChapter;
  [Events.EpisodeChange]: NovelChapter & {
    currentTime: number;
  };
  [Events.EpisodesChange]: NovelChapter[];
  [Events.BeforeNextEpisode]: void;
  [Events.BeforePrevEpisode]: void;
  [Events.BeforeChangeSource]: void;
  [Events.StateChange]: SeasonCoreState;
};
type SeasonCoreState = {
  profile: null | {
    id: string;
    name: string;
    overview: string;
    posterPath: string;
  };
  curSource: null | CurNovelChapter;
  chapters: NovelChapter[];
  // curGroup: null | SeasonEpisodeGroup;
};
type SeasonCoreProps = {
  client: HttpClientCore;
};

export class NovelReaderCore extends BaseDomain<TheTypesOfEvents> {
  profile: null | {
    id: string;
    name: string;
    overview: string;
    posterPath: string;
  } = null;
  // sourceGroups: SeasonEpisodeGroup[] = [];
  chapters: NovelChapter[] = [];
  /** 该电视剧名称、剧集等信息 */
  curChapter: null | CurNovelChapter = null;
  // curGroup: null | SeasonEpisodeGroup = null;
  /** 当前影片播放进度 */
  currentTime = 0;
  curResolutionType: MediaResolutionTypes = MediaResolutionTypes.SD;
  /** 正在播放中 */
  playing = false;
  /** 正在请求中（获取详情、视频源信息等） */
  private _pending = false;

  $source: NovelChapterSourceFileCore;
  $chapters: ListCoreV2<
    RequestCoreV2<{ fetch: typeof fetchChapters; process: typeof fetchChaptersProcess; client: HttpClientCore }>,
    NovelChapter
  >;
  $client: HttpClientCore;

  get state(): SeasonCoreState {
    return {
      profile: this.profile,
      curSource: this.curChapter,
      chapters: this.chapters,
    };
  }

  constructor(props: Partial<{ name: string }> & SeasonCoreProps) {
    super();

    const { client } = props;
    this.$client = client;
    this.$chapters = new ListCoreV2(
      new RequestCoreV2({
        fetch: fetchChapters,
        process: fetchChaptersProcess,
        client,
      })
    );
    this.$source = new NovelChapterSourceFileCore({
      client,
    });
  }

  async fetchProfile(novel_id: string) {
    if (novel_id === undefined) {
      const msg = this.tip({ text: ["缺少季 id 参数"] });
      return Result.Err(msg);
    }
    const fetch = new RequestCoreV2({
      fetch: fetchMediaPlayingEpisode,
      process: fetchMediaPlayingEpisodeProcess,
      client: this.$client,
    });
    const res = await fetch.run({ novel_id });
    if (res.error) {
      const msg = this.tip({ text: ["获取小说详情失败", res.error.message] });
      return Result.Err(msg);
    }
    const { id, name, overview, chapterCount, coverPath: posterPath, curChapter, chapters, next_marker } = res.data;
    // console.log("[DOMAIN]media/season - fetchProfile result", curSource);
    this.chapters = chapters;
    this.$chapters.setDataSource(chapters);
    this.$chapters.setParams({
      novel_id,
      next_marker,
    });
    if (curChapter === null) {
      const msg = this.tip({ text: ["该小说没有章节"] });
      return Result.Err(msg);
    }
    this.profile = {
      id,
      name,
      overview,
      posterPath,
    };
    this.emit(Events.ProfileLoaded, { profile: this.profile, curSource: curChapter });
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok({ ...this.state });
  }

  /** 播放该电视剧下指定影片 */
  async playEpisode(episode: NovelChapter, extra: { currentTime: number }) {
    const { currentTime = 0 } = extra;
    console.log("[DOMAIN]media/season - playEpisode", episode, this.curChapter);
    const { id, files } = episode;
    if (this.curChapter && id === this.curChapter.id) {
      this.tip({
        text: ["已经是该剧集了"],
      });
      return Result.Ok(this.curChapter);
    }
    if (files.length === 0) {
      const tip = this.tip({
        text: ["该剧集缺少视频源"],
      });
      return Result.Err(tip);
    }
    const file = files[0];
    // console.log("[DOMAIN]media/season - playEpisode before this.$source.load", episode);
    const r = await this.$source.load(file);
    if (r.error) {
      const tip = this.tip({
        text: ["加载章节内容失败", r.error.message],
      });
      return Result.Err(tip);
    }
    this.currentTime = currentTime;
    this.curChapter = { ...episode, progress: currentTime, curFile: r.data };
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(this.curChapter);
  }
  /** 切换剧集 */
  switchEpisode(episode: NovelChapter) {
    return this.playEpisode(episode, { currentTime: 0 });
  }
  /** 获取下一剧集 */
  async getNextEpisode() {
    if (this.profile === null) {
      return Result.Err("请先调用 fetchProfile 方法");
    }
    const curChapter = this.curChapter;
    if (curChapter === null) {
      return Result.Err("请先调用 fetchProfile 方法");
    }
    // const { id, order } = this.curEpisode;
    const curChapterIndex = this.chapters.findIndex((chapter) => chapter.id === curChapter.id);
    if (curChapterIndex === -1) {
      return Result.Err("没有找到当前章节");
    }
    const nextChapter = this.chapters[curChapterIndex + 1];
    if (nextChapter) {
      return Result.Ok(nextChapter);
    }
    const r = await this.$chapters.next();
    if (r.error) {
      return Result.Err(r.error);
    }
    if (r.data.dataSource.length === 0) {
      return Result.Err("已经是最后一章了3");
    }
    const { id, order, name, files } = r.data.dataSource[0];
    this.chapters = this.chapters.concat(r.data.dataSource);
    const r2 = await this.$source.load(files[0]);
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    this.curChapter = {
      id,
      name,
      order,
      files,
      progress: 0,
      curFile: r2.data,
    };
    // this.emit(Events.EpisodesChange, { ...this.curChapter });
    this.emit(Events.StateChange, { ...this.state });
    // nextGroup.list = r.data;
    // curGroup.cur = false;
    // nextGroup.cur = true;
    // const nextEpisode = nextGroup.list[0];
    // curEpisode.cur = false;
    // nextEpisode.cur = true;
    return Result.Ok(null);
  }
  /** 为播放下一集进行准备 */
  prepareNextEpisode() {}
  /** 播放下一集 */
  async playNextEpisode() {
    if (this._pending) {
      const msg = this.tip({ text: ["正在加载..."] });
      return Result.Err(msg);
    }
    this.emit(Events.BeforeNextEpisode);
    this._pending = true;
    const r = await this.getNextEpisode();
    this._pending = false;
    if (r.error) {
      const msg = this.tip({ text: [r.error.message] });
      return Result.Err(msg);
    }
    const nextEpisode = r.data;
    if (nextEpisode === null) {
      return Result.Err("没有找到可播放剧集");
    }
    await this.playEpisode(nextEpisode, { currentTime: 0 });
    return Result.Ok(null);
  }
  async fetchEpisodeOfGroup(group: { start: number; end: number }) {
    // if (this.profile === null) {
    //   const msg = this.tip({
    //     text: ["请先调用 fetchProfile"],
    //   });
    //   return Result.Err(msg);
    // }
    // const matchedGroup = this.sourceGroups.find((g) => g.start === group.start && g.end === group.end);
    // if (!matchedGroup) {
    //   const msg = this.tip({
    //     text: ["参数错误"],
    //   });
    //   return Result.Err(msg);
    // }
    // const fetch = new RequestCoreV2({
    //   fetch: fetchSourceInGroup,
    //   process: fetchSourceInGroupProcess,
    //   client: this.$client,
    // });
    // const r = await fetch.run({ novel_id: this.profile.id });
    // if (r.error) {
    //   return Result.Err(r.error);
    // }
    // if (r.data.length === 0) {
    //   return Result.Err("没有剧集");
    // }
    // if (this.curGroup) {
    //   this.curGroup.cur = false;
    // }
    // matchedGroup.list = r.data;
    // matchedGroup.cur = true;
    // this.curGroup = matchedGroup;
    // this.emit(Events.StateChange, { ...this.state });
    // return Result.Ok(null);
  }
  async changeSourceFile(sourceFile: CurNovelChapter["curFile"]) {
    if (this.profile === null) {
      const msg = this.tip({ text: ["视频还未加载完成"] });
      return Result.Err(msg);
    }
    if (this.curChapter === null) {
      const msg = this.tip({ text: ["视频还未加载完成"] });
      return Result.Err(msg);
    }
    const res = await this.$source.load({ id: sourceFile.id });
    this.curChapter.curFile = sourceFile;
    if (res.error) {
      this.tip({
        text: [res.error.message],
      });
      return Result.Err(res.error);
    }
    // this.emit(Events.SourceFileChange, { ...res.data, progress: this.currentTime });
    return Result.Ok(null);
  }
  setCurrentTime(currentTime: number) {
    this.currentTime = currentTime;
  }
  setCurResolution(type: MediaResolutionTypes) {
    this.curResolutionType = type;
  }
  markFileInvalid(id: string) {
    if (!this.curChapter) {
      return;
    }
    const matched = this.curChapter.files.find((f) => f.id === id);
    if (!matched) {
      return;
    }
    this.curChapter.files = this.curChapter.files.map((f) => {
      if (f.id === id) {
        return {
          ...f,
          invalid: true,
        };
      }
      return f;
    });
  }
  updatePlayProgressForce(values: Partial<{ currentTime: number; duration: number }> = {}) {
    const { currentTime = this.currentTime, duration = 0 } = values;
    console.log(
      "[DOMAIN]media/season - update_play_progress",
      currentTime,
      this.profile,
      this.curChapter,
      this.$source.profile
    );
    if (this.profile === null) {
      return;
    }
    if (this.curChapter === null) {
      return;
    }
    const request = new RequestCoreV2({
      fetch: updatePlayHistory,
      client: this.$client,
    });
    request.run({
      novel_id: this.profile.id,
      novel_chapter_id: this.curChapter.id,
      file_id: this.curChapter.curFile.id,
      progress: parseFloat(currentTime.toFixed(2)),
      duration: parseFloat(duration.toFixed(2)),
    });
  }
  /** 更新观看进度 */
  updatePlayProgress = throttle_1(10 * 1000, (values: Partial<{ currentTime: number; duration: number }> = {}) => {
    this.updatePlayProgressForce(values);
  });
  /** 当前进度改变 */
  handleCurTimeChange(values: { currentTime: number; duration: number }) {
    this.playing = true;
    this._pause();
    const { currentTime = 0 } = values;
    // console.log("[DOMAIN]tv/index - handleCurTimeChange", currentTime);
    this.currentTime = currentTime;
    this.updatePlayProgress(values);
  }
  /** 当 800 毫秒内没有播放，就表示暂停了 */
  _pause = debounce(800, () => {
    this.playing = false;
  });
  getTitle(): string[] {
    // console.log("[DOMAIN]media - getTitle", this.profile);
    if (this.profile && this.curChapter) {
      const { name: episodeText } = this.curChapter;
      const { name } = this.profile;
      return [episodeText, name];
    }
    if (this.profile) {
      const { name } = this.profile;
      return [name];
    }
    return [];
  }

  onSourceFileChange(handler: Handler<TheTypesOfEvents[Events.SourceFileChange]>) {
    return this.on(Events.SourceFileChange, handler);
  }
  onProfileLoaded(handler: Handler<TheTypesOfEvents[Events.ProfileLoaded]>) {
    return this.on(Events.ProfileLoaded, handler);
  }
  onEpisodeChange(handler: Handler<TheTypesOfEvents[Events.EpisodeChange]>) {
    return this.on(Events.EpisodeChange, handler);
  }
  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
  onBeforeNextEpisode(handler: Handler<TheTypesOfEvents[Events.BeforeNextEpisode]>) {
    return this.on(Events.BeforeNextEpisode, handler);
  }
  onBeforePrevEpisode(handler: Handler<TheTypesOfEvents[Events.BeforePrevEpisode]>) {
    return this.on(Events.BeforePrevEpisode, handler);
  }
  onBeforeChangeSource(handler: Handler<TheTypesOfEvents[Events.BeforeChangeSource]>) {
    return this.on(Events.BeforeChangeSource, handler);
  }
}

function throttle_1(delay: number, fn: Function) {
  let canInvoke = true;

  setInterval(() => {
    canInvoke = true;
  }, delay);

  return (...args: unknown[]) => {
    if (canInvoke === false) {
      return;
    }
    fn(...args);
    canInvoke = false;
  };
}
