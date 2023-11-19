import { AcClient } from "./client";
import {
  getStartPlayInfo,
  getGiftList,
  userLogin,
  getDid,
  visitorLogin,
  userSignIn,
} from "./tools";
import { LoginInfo } from "./types";

export async function getAcClient(
  authorId: number,
  option?: {
    login: boolean;
    userInfo: { username: string; password: string };
  }
) {
  const did = await getDid();

  // 获取登录信息(登录用户/访客)
  if (option?.login && !option.userInfo) {
    throw new Error("must pass userinfo by using login mode");
  }
  let loginInfo: LoginInfo;
  if (option?.login) {
    const { acPasstoken, authKey } = await userSignIn(did, option.userInfo);
    loginInfo = (await userLogin(did, acPasstoken, authKey).catch(
      (err: any) => {
        console.log("error:" + err.message);
        throw err;
      }
    ))!;
  } else {
    loginInfo = (await visitorLogin(did).catch((err: any) => {
      console.log("error:" + err.message);
      throw err;
    }))!;
  }
  console.log(loginInfo);
  // 获取直播基本信息
  const liveInfo = await getStartPlayInfo({
    did,
    userId: loginInfo.userId,
    st: loginInfo.st,
    authorId,
  }).catch((err: any) => {
    console.log("error:" + err.message);
    throw err;
  });
  if (!liveInfo) throw ""; // 获取直播信息失败/主播未开播
  const giftList = await getGiftList({
    did,
    userId: loginInfo.userId,
    st: loginInfo.st,
    liveId: liveInfo.liveId,
    authorId: authorId,
  }).catch((err: any) => {
    console.log("error:" + err.message);
    throw err;
  });

  return {
    client: new AcClient({
      ...loginInfo,
      ...liveInfo,
    }),
    liveInfo,
    giftList,
  };
}
