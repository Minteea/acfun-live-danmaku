import { url, config, USER_AGENT } from "../config";
import { GiftList, LoginInfo, StartPlayInfo } from "../types";

/** 自定义fetch设置 */
export interface FetchOptions {
  /** 自定义fetch函数(适用于请求中转等情况) */
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  /** 用户代理字段 */
  userAgent?: string;
  /** cookie字段 */
  cookie?: string;
}

/** 自定义fetch */
export function customFetch(
  {
    fetch = globalThis.fetch,
    userAgent = USER_AGENT,
    cookie = "",
  }: FetchOptions = {},
  input: string | URL,
  init?: RequestInit
) {
  return fetch(input.toString(), {
    ...init,
    headers: {
      Cookie: cookie,
      "User-Agent": userAgent,
      ...init?.headers,
    },
  });
}

/** 从Headers获取cookie */
export function getSetCookie(headers: Headers) {
  const cookie: Record<string, string> = {};
  headers.forEach((val, key) => {
    if (key == "set-cookie") {
      const coo = val.split(";")[0].split("=");
      const key = coo[0]?.trim();
      const value = coo[1]?.trim();
      cookie[key] = value;
    }
  });
  return cookie;
}

/** 获取基础cookie
 * @returns 含有 `did` 字段的cookie */
export async function requestDidCookie(
  options?: FetchOptions
): Promise<Record<"_did", string>> {
  const res = await customFetch(options, url.LOGIN);
  const cookie = getSetCookie(res.headers);
  return cookie;
}

/** 获取游客登录凭证
 *
 * @param options 需要cookie的 `_did` 字段
 */
export async function requestVisitorLogin(options?: FetchOptions): Promise<{
  acSecurity: string;
  "acfun.api.visitor_st": string;
  userId: number;
}> {
  const res = await customFetch(options, url.VISITOR_LOGIN, {
    method: "POST",
    body: `sid=${config.acfun_visitor_sid}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await res.json();
  if (data.result == 0) {
    return data;
  } else throw data;
}

/** 获取用户登录凭证
 *
 * @param options 需要cookie的 `_did` `acPasstoken` `auth_key` 字段
 *  */
export async function requestTokenGet(options: FetchOptions): Promise<{
  ssecurity: string;
  "acfun.midground.api_st": string;
  userId: number;
}> {
  const res = await customFetch(
    options,
    "https://id.app.acfun.cn/rest/web/token/get?sid=acfun.midground.api",
    {
      method: "POST",
    }
  );
  const data = await res.json();
  if (data.result == 0) {
    return data;
  } else throw data;
}

/** 获取用户登录cookie
 *
 * @param options 需要cookie的 `_did` 字段
 * @returns 含有 `acPasstoken` `auth_key` 字段的cookie
 *  */
export async function requestLoginSigninCookie(
  params: {
    username: string;
    password: string;
  },
  options: FetchOptions
): Promise<Record<"acPasstoken" | "auth_key", string>> {
  const res = await customFetch(
    options,
    `${url.SIGN_IN}?${new URLSearchParams(params)}`,
    {
      method: "POST",
      headers: {
        credentials: "include",
      },
    }
  );
  const data = await res.json();
  if (data.result != 0) {
    throw new Error(data.result);
  }
  const cookie = getSetCookie(res.headers);
  return cookie;
}

/** 获取开播信息 */
export async function getStartPlayInfo(
  {
    did,
    userId,
    authorId,
    ...stParams
  }: {
    did: string;
    userId: number;
    authorId: number;
    "acfun.midground.api_st"?: string;
    "acfun.api.visitor_st"?: string;
  },
  options?: FetchOptions
): Promise<StartPlayInfo> {
  const baseParams: Record<string, string> = {
    subBiz: config.kuaishou.subBiz,
    kpn: config.kuaishou.kpn,
    userId: userId.toString(),
    did: did,
    kpf: config.kuaishou.kpf,
  };
  if (stParams["acfun.api.visitor_st"]) {
    baseParams["acfun.api.visitor_st"] = stParams["acfun.api.visitor_st"];
  }
  if (stParams["acfun.midground.api_st"]) {
    baseParams["acfun.midground.api_st"] = stParams["acfun.midground.api_st"];
  }
  const res = await customFetch(
    options,
    `${url.START_PLAY}?${new URLSearchParams(baseParams)}`,
    {
      method: "POST",
      headers: {
        Referer: url.LIVE + authorId,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `authorId=${authorId}&pullStreamType=FLV`,
    }
  );
  const data = await res.json();
  if (data.result != 1) {
    throw data;
  }
  return data.data;
}

/** 获取礼物列表 */
export async function getGiftList(
  {
    did,
    userId,
    authorId,
    liveId,
    ...stParams
  }: {
    did: string;
    userId: number;
    authorId: number;
    liveId: string;
    "acfun.midground.api_st"?: string;
    "acfun.api.visitor_st"?: string;
  },
  options?: FetchOptions
): Promise<GiftList> {
  const baseParams: Record<string, string> = {
    subBiz: config.kuaishou.subBiz,
    kpn: config.kuaishou.kpn,
    userId: userId.toString(),
    did: did,
    kpf: config.kuaishou.kpf,
  };
  if (stParams["acfun.api.visitor_st"]) {
    baseParams["acfun.api.visitor_st"] = stParams["acfun.api.visitor_st"]!;
  }
  if (stParams["acfun.midground.api_st"]) {
    baseParams["acfun.midground.api_st"] = stParams["acfun.midground.api_st"]!;
  }
  const res = await customFetch(
    options,
    `${url.GIFT_LIST}?${new URLSearchParams(baseParams)}`,
    {
      method: "POST",
      headers: {
        Referer: url.LIVE + authorId,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `visitorId=${userId}&liveId=${liveId}`,
    }
  );
  const data = await res.json();
  if (data.result != 1) {
    throw data;
  }
  return data.data.giftList;
}
