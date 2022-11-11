import AcClient from "./client";
import tools from "./tools"

export = async function (
  authorId: string | number,
  option?: {
    login: boolean,
    userinfo: {
      username: string,
      password: string
    }
  }
) {
  const did = await tools.getDid();

  // 获取登录信息(登录用户/访客)
  if (option?.login && !option.userinfo) {
    throw new Error("must pass userinfo by using login mode")
  }
  const loginInfo = option?.login ?
    await tools.userlogin(did, option.userinfo).catch((err: any) => {
      console.log("error:"+err.message)
      return
    }) : 
    await tools.visitorlogin(did).catch((err: any) => {
      console.log("error:"+err.message)
      return
    });
  if (!loginInfo) return  // 获取登录信息失败/主播未开播
  // 获取直播基本信息
  const liveInfo = await tools.startPlayInfo(
    did,
    loginInfo.userId,
    loginInfo.visitorSt,
    authorId,
    option?.login
  ).catch((err: any) => {
    console.log("error:"+err.message)
    return
  });
  if (!liveInfo) return   // 获取播放信息失败/主播未开播
  const giftListRet = await tools.getGiftInfoList(
    did,
    loginInfo.userId,
    loginInfo.visitorSt,
    liveInfo.liveId,
    authorId,
    option?.login
  ).catch((err: any) => {
    console.log("error:"+err.message)
    return
  });
  const giftList = giftListRet?.giftList || null

  return new AcClient({
    did,
    loginInfo,
    liveInfo,
    giftList,
  })
}