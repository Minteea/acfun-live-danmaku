import { getAcClient } from "../src";

//使用init(主播房间号)初始化客户端
getAcClient(3473754)
  .then(({ client, liveInfo, giftList }) => {
    if (!client) {
      console.log("初始化客户端失败");
      return;
    }
    client.addEventListener("open", () => {
      console.log("已连接到直播服务器");
    });
    client.addEventListener("EnterRoomAck", () => {
      console.log("已连接到直播间");
    });
    client.addEventListener("close", () => {
      console.log("连接已关闭");
    });
    client.addEventListener("error", (e) => {
      console.log("发生错误");
      console.error(e);
    });
    client.addEventListener("error:decode", (e) => {
      console.log("发生解码错误");
      console.error(e.error);
    });
    client.addEventListener("RecentComment", ({ data }) => {
      // 获得建立连接当前的弹幕列表
      //console.log(data);
    });
    client.addEventListener("Comment", ({ data }) => {
      // 发送弹幕
      console.log(data);
    });
    client.addEventListener("Like", ({ data }) => {
      // 用户点赞
      console.log(data);
    });
    client.addEventListener("UserEnterRoom", ({ data }) => {
      // 用户进入直播间
      console.log(data);
    });
    client.addEventListener("UserFollowAuthor", ({ data }) => {
      // 用户关注了主播
      console.log(data);
    });
    client.addEventListener("Gift", ({ data }) => {
      // 用户投喂了礼物
      console.log(data);
    });
    client.addEventListener("LiveClosed", () => {
      console.log("直播结束");
    });
    client.addEventListener("LiveBanned", () => {
      console.log("直播间被封禁");
    });
  })
  .catch((err) => {
    console.error(err);
  });
