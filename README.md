# acfun-live-danmaku

## 简介

- acfun-live-danmaku 是基于[ACFUN-FOSS/ac-danmu.js](https://github.com/ACFUN-FOSS/ac-danmu.js)的 Typescript 改进版本，是[orzogc/acfundanmu](https://github.com/orzogc/acfundanmu)的 Nodejs 实现
- 这些项目的诞生都离不开[wpscott/AcFunDanmaku](https://github.com/wpscott/AcFunDanmaku/tree/master/AcFunDanmu)提供的实现思路和配置文件，请给他们点 Star

## acfun-live-danmaku 是一个用于获取 acfun 直播弹幕的服务端 js 组件

- 因为使用了 buffer 所以不能运行在浏览器环境下, 编写使用 node v16 lts

### 使用方式

```JavaScript
const { getAcClient } = require("acfun-live-danmaku")

// 使用init(主播房间号)初始化客户端
AcClient("8500263").then(({ client }) => {
    // 启动websocket连接
    client.wsStart();
    client.on("EnterRoomAck", () => {
        console.log("Enter room success!");
    });
    client.on("RecentComment", (msg) => {
        // 获得建立连接当前的弹幕列表
        console.log(msg);
    });
    client.on("Comment", (msg) => {
        // 收到的弹幕
        console.log(msg);
    });
});
```

或者

```JavaScript
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

```JavaScript
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

| 事件             | 消息               | payload 类型                       |
| ---------------- | ------------------ | ---------------------------------- |
| open             | 已连接到服务器     |                                    |
| close            | 连接已关闭         |                                    |
| message          | 接收到消息         |                                    |
| error            | 连接发生错误       |                                    |
|                  |                    |                                    |
| EnterRoomAck     | 已连接到直播间     |                                    |
|                  |                    |                                    |
| ActionSignal     | 行为事件           |                                    |
| Comment          | 弹幕               | CommonActionSignalComment          |
| Like             | 点赞               | CommonActionSignalLike             |
| Gift             | 发送礼物           | CommonActionSignalGift             |
| UserFollowAuthor | 关注主播           | CommonActionSignalUserFollowAuthor |
| UserEnterRoom    | 用户进入直播间     | CommonActionSignalUserEnterRoom    |
| JoinClub         | 用户加入主播守护团 | AcfunActionSignalJoinClub          |
|                  |                    |                                    |
| StateSignal      | 状态事件           |                                    |
| DisplayInfo      | 当前直播间数据状态 | CommonStateSignalDisplayInfo       |
| RecentComment    | 当前弹幕列表       | CommonStateSignalRecentComment     |
| TopUsers         | 前几名用户的数据   | CommonStateSignalTopUsers          |

### 安装

`npm i acfun-live-danmaku --save`
