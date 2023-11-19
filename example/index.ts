import { getAcClient } from "../index";

//使用init(主播房间号)初始化客户端
getAcClient(378269).then(({ client, liveInfo, giftList }) => {
  if (!client) {
    console.log("初始化客户端失败");
    return;
  }
  client.on("open", () => {
    console.log("已连接到直播服务器");
  });
  client.on("EnterRoomAck", () => {
    console.log("已连接到直播间");
  });
  client.on("close", () => {
    console.log("连接已关闭");
  });
  client.on("RecentComment", (msg) => {
    // 获得建立连接当前的弹幕列表
    console.log(msg);
  });
  client.on("Comment", (msg) => {
    // 发送弹幕
    console.log(msg);
  });
  client.on("Like", (msg) => {
    // 用户点赞
    console.log(msg);
  });
  client.on("UserEnterRoom", (msg) => {
    // 用户进入直播间
    console.log(msg);
  });
  client.on("UserFollowAuthor", (msg) => {
    // 用户关注了主播
    console.log(msg);
  });
  client.on("Gift", (msg) => {
    // 用户投喂了礼物
    console.log(msg);
  });
  client.on("LiveClosed", () => {
    console.log("直播结束");
  });
  client.on("LiveBanned", () => {
    console.log("直播间被封禁");
  });
});
