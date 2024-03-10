import { TmpRequestResp, request } from "@/domains/request/utils";
import { RequestedResource, Result, Unpacked, UnpackedResult } from "@/types/index";

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
