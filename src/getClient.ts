import { AcClient } from "./client";
import {
  getStartPlayInfo,
  getGiftList,
  requestTokenGet,
  requestDidCookie,
  requestVisitorLogin,
  requestLoginSigninCookie,
} from "./utils";
import { Cookies } from "./utils/cookie";

export async function getAcClient(
  authorId: number,
  options?: {
    login: { username: string; password: string };
  }
) {
  let cookies = new Cookies(await requestDidCookie());

  let loginTokens: {
    ssecurity?: string;
    acSecurity?: string;
    "acfun.midground.api_st"?: string;
    "acfun.api.visitor_st"?: string;
    userId: number;
  };
  if (options?.login) {
    const resCookies = await requestLoginSigninCookie(options.login, {
      cookie: cookies.toString(),
    });
    cookies.append(resCookies);

    loginTokens = await requestTokenGet({
      cookie: cookies.toString(),
    }).catch((err: any) => {
      console.log("error:requestTokenGet");
      throw err;
    });
  } else {
    loginTokens = await requestVisitorLogin({
      cookie: cookies.toString(),
    }).catch((err: any) => {
      console.log("error:requestVisitorLogin");
      throw err;
    });
  }
  console.log(loginTokens);
  // 获取直播基本信息
  const liveInfo = await getStartPlayInfo({
    did: cookies.get("_did"),
    userId: loginTokens.userId,
    "acfun.midground.api_st": loginTokens["acfun.midground.api_st"],
    "acfun.api.visitor_st": loginTokens["acfun.api.visitor_st"],
    authorId,
  }).catch((err: any) => {
    console.log("error:getStartPlayInfo");
    throw err;
  });
  if (!liveInfo) throw new Error("Failed to get StartPlayInfo"); // 获取直播信息失败/主播未开播
  const giftList = await getGiftList({
    did: cookies.get("_did"),
    userId: loginTokens.userId,
    "acfun.midground.api_st": loginTokens["acfun.midground.api_st"],
    "acfun.api.visitor_st": loginTokens["acfun.api.visitor_st"],
    liveId: liveInfo.liveId,
    authorId: authorId,
  }).catch((err: any) => {
    console.log("error:getGiftList");
    throw err;
  });

  return {
    client: new AcClient({
      userId: loginTokens.userId,
      st:
        loginTokens["acfun.midground.api_st"] ||
        loginTokens["acfun.api.visitor_st"]!,
      security: loginTokens["acSecurity"] || loginTokens["ssecurity"]!,
      ...liveInfo,
    }),
    liveInfo,
    giftList,
  };
}
