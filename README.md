# acfun-live-danmaku

## 简介

- acfun-live-danmaku 是基于 [ACFUN-FOSS/ac-danmu.js](https://github.com/ACFUN-FOSS/ac-danmu.js) 的 TypeScript 改进版本，在此基础上兼容各种符合现行 ES 标准和 Web API 的运行环境，包括浏览器环境
- acfun-live-danmaku 和 [ACFUN-FOSS/ac-danmu.js](https://github.com/ACFUN-FOSS/ac-danmu.js) 也是 [orzogc/acfundanmu](https://github.com/orzogc/acfundanmu) 的 JavaScript 实现
- 这些项目的诞生都离不开 [wpscott/AcFunDanmaku](https://github.com/wpscott/AcFunDanmaku/tree/master/AcFunDanmu) 提供的实现思路和配置文件，请给他们点 Star

## acfun-live-danmaku 是一个用于获取 AcFun 直播弹幕的 JavaScript 库

- 支持在浏览器环境和 NodeJS 环境下运行, 使用 NodeJS v22 LTS 开发

### 安装

```
npm i acfun-live-danmaku --save
```

### 使用方式

```JavaScript
import { getAcClient } from "acfun-live-danmaku"

// 使用init(主播房间号)初始化客户端
AcClient("8500263").then(({ client }) => {
    // 启动websocket连接
    client.wsStart();
    client.addEventListener("EnterRoomAck", () => {
        console.log("Enter room success!");
    });
    client.addEventListener("RecentComment", ({ data }) => {
        // 获得建立连接当前的弹幕列表
        console.log(data);
    });
    client.addEventListener("Comment", ({ data }) => {
        // 收到的弹幕
        console.log(data);
    });
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
