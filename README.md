# acfun-live-danmaku

## 简介

* acfun-live-danmaku是基于[ACFUN-FOSS/ac-danmu.js](https://github.com/ACFUN-FOSS/ac-danmu.js)的Typescript改进版本，是[orzogc/acfundanmu](https://github.com/orzogc/acfundanmu)的Nodejs实现
* 这些项目的诞生都离不开[wpscott/AcFunDanmaku](https://github.com/wpscott/AcFunDanmaku/tree/master/AcFunDanmu)提供的实现思路和配置文件，请给他们点Star

## acfun-live-danmaku是一个用于获取acfun直播弹幕的服务端js组件

* 因为使用了buffer所以不能运行在浏览器环境下, 编写使用node v16 lts

### 使用方式

见example
``` JavaScript
const AcClient = require("acfun-live-danmaku")

// 使用init(主播房间号)初始化客户端
AcClient("8500263").then(() => {
    // 启动websocket连接
    ac_client.wsStart();
    ac_client.on("EnterRoomAck", () => {
        console.log("Enter room success!");
    });
    ac_client.on("recent-comment", (msg) => {
        // 获得建立连接当前的弹幕列表
        console.log(msg);
    });
    ac_client.on("Comment", (msg) => {
        // 收到的弹幕
        console.log(msg);
    });
});
```

或者

``` JavaScript
const { getAcClient } = require("acfun-live-danmaku")

// 使用init(主播房间号)初始化客户端
const { client } = await getAcClient("8500263")
// 启动websocket连接
client.wsStart();
client.on("EnterRoomAck", () => {
    console.log("Enter room success!");
});
client.on("RecentComment", (commmnets) => {
    // 获得建立连接当前的弹幕列表
    console.log(commmnets);
});
client.on("Comment", (danmaku) => {
    // 收到的弹幕
    console.log(danmaku);
});
```

收到的弹幕返回如下

``` JavaScript
{
    content: '晚安',
    sendTimeMs: Long {
        low: -1921110048,
        high: 372,
        unsigned: false
    },
    userInfo: ZtLiveUserInfo {
        avatar: [
            [ImageCdnNode]
        ],
        userId: Long {
            low: 147764,
            high: 0,
            unsigned: false
        },
        nickname: 'NNK',
        badge: '{"medalInfo":{"uperId":100001,"userId":100001,"clubName":"蓝钻","level":100}}',
        userIdentity: ZtLiveUserIdentity {}
    }
}
```

### 事件列表

| 事件                | 消息                    | payload类型                        |
|---------------------|-------------------------|------------------------------------|
| EnterRoomAck          | 程序进入直播间        | null                              |
| Comment               | 弹幕                  | CommonActionSignalComment          |
| Like                  | 点赞                  | CommonActionSignalLike            |
| Gift                  | 发送礼物              | CommonActionSignalGift            |
| UserFollowAuthor      | 关注主播              | CommonActionSignalUserFollowAuthor |
| UserEnterRoom         | 用户进入直播间         | CommonActionSignalUserEnterRoom  |
| DisplayInfo           | 当前直播间数据状态     | CommonStateSignalDisplayInfo      |
| RecentComment         | 当前弹幕列表           | CommonStateSignalRecentComment   |
| TopUsers              | 前几名用户的数据       | CommonStateSignalTopUsers        |
| JoinClub              | 用户加入主播守护团     | AcfunActionSignalJoinClub        |

### 安装

 `npm i acfun-live-danmaku --save`
