/**
 * @file 视频文件播放
 * 提供获取播放地址、切换分辨率、字幕展示等功能
 */
import { BaseDomain, Handler } from "@/domains/base";
import { RequestCoreV2 } from "@/domains/request/v2";
import { HttpClientCore } from "@/domains/http_client";
import { Result } from "@/types";

import { NovelChapterSourceFile, fetchSourcePlayingInfo, fetchSourcePlayingInfoProcess } from "./services";

enum Events {
  /** 切换章节内容 */
  SourceChange,
  StateChange,
  /** 字幕加载完成 */
  SubtitleLoaded,
}
type TheTypesOfEvents = {
  [Events.SourceChange]: NovelChapterSourceFile & { currentTime: number };
  [Events.StateChange]: NovelChapterSourceFileCoreState;
};

type NovelChapterSourceFileCoreState = {};
type NovelChapterSourceFileCoreProps = {
  client: HttpClientCore;
};

export class NovelChapterSourceFileCore extends BaseDomain<TheTypesOfEvents> {
  profile: null | NovelChapterSourceFile = null;
  /** 正在请求中 */
  loading = false;

  $client: HttpClientCore;

  get state(): NovelChapterSourceFileCoreState {
    return {};
  }

  constructor(props: Partial<{ name: string }> & NovelChapterSourceFileCoreProps) {
    super();

    const { client } = props;
    this.$client = client;
  }

  /** 获取小说章节内容 */
  async load(file: { id: string }) {
    const fetch = new RequestCoreV2({
      fetch: fetchSourcePlayingInfo,
      process: fetchSourcePlayingInfoProcess,
      client: this.$client,
    });
    const res = await fetch.run({
      file_id: file.id,
    });
    if (res.error) {
      this.tip({
        text: ["获取章节内容失败", res.error.message],
      });
      return Result.Err(res.error);
    }
    const { id, name, content } = res.data;
    this.profile = {
      id,
      name,
      content,
    };
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(this.profile);
  }

  onSourceChange(handler: Handler<TheTypesOfEvents[Events.SourceChange]>) {
    return this.on(Events.SourceChange, handler);
  }
  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
}
