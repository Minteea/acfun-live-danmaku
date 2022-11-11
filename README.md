<!--
 * @Date: 2020-09-15 00:30:41
 * @LastEditors: kanoyami
 * @LastEditTime: 2020-10-09 15:50:49
-->

# acfun-live-danmaku

## 简介

* acfun-live-danmaku是基于[ACFUN-FOSS/ac-danmu.js](https://github.com/ACFUN-FOSS/ac-danmu.js)的Typescript改进版本，是[orzogc/acfundanmu](https://github.com/orzogc/acfundanmu)的Nodejs实现
* 这些项目的诞生都离不开[wpscott/AcFunDanmaku](https://github.com/wpscott/AcFunDanmaku/tree/master/AcFunDanmu)提供的实现思路和配置文件，请给他们点Star

## acfun-live-danmaku是一个用于获取acfun直播弹幕的服务端js组件

* 因为使用了buffer所以不能运行在浏览器环境下, 编写使用node v16 lts

### 可实现

* Promise化的使用方式
* 事件化的使用流程

### 使用方式

见example
``` JavaScript
const AcClient = require("acfun-live-danmaku")

//使用init(主播房间号)初始化客户端
AcClient("8500263").then(() => {
    //启动websocket连接
    ac_client.wsStart();
    ac_client.on("EnterRoomAck", () => {
        console.log("Enter room success!");
    });
    ac_client.on("recent-comment", (commmnets) => {
        //获得建立连接当前的弹幕列表
        console.log(commmnets);
    });
    ac_client.on("danmaku", (danmaku) => {
        //收到的弹幕
        console.log(danmaku);
    });
});
```

或者

``` JavaScript
const AcClient = require("acfun-live-danmaku")

//使用init(主播房间号)初始化客户端
ac_client = await AcClient("8500263")
//启动websocket连接
ac_client.wsStart();
ac_client.on("EnterRoomAck", () => {
    console.log("Enter room success!");
});
ac_client.on("RecentComment", (commmnets) => {
    //获得建立连接当前的弹幕列表
    console.log(commmnets);
});
ac_client.on("Comment", (danmaku) => {
    //收到的弹幕
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
| EnterRoomAck                 | 程序进入直播间        | null                               |
| Comment               | 弹幕                  | CommonActionSignalComment          |
| Like                  | 点赞                  | CommonActionSignalLike        |
| ThrowBanana           | ~~投蕉(已弃用)~~      | AcfunActionSignalThrowBanana               |
| Gift                  | 发送礼物              | CommonActionSignalGift        |
| UserFollowAuthor      | 关注主播              | CommonActionSignalUserFollowAuthor |
| DisplayInfo           | 当前直播间数据状态     | CommonStateSignalDisplayInfo      |
| CurrentRedpackList    | 不知道                | CommonStateSignalCurrentRedpackList     |
| RecentComment         | 当前弹幕列表           | CommonActionSignalComment[]        |
| TopUsers              | 前几名用户的数据       | CommonStateSignalTopUsers        |
| UserEnterRoom         | 用户进入直播间         | CommonActionSignalUserEnterRoom
| JoinClub              | 用户加入主播守护团     | AcfunActionSignalJoinClub     |

### 安装

 `npm i acfun-live-danmaku --save`
