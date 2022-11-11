import AcClient from "../client";

import acClient from "../index";

//使用init(主播房间号)初始化客户端
acClient("378269").then((ac_client?: AcClient) => {//1345673
    if (!ac_client) {
        console.log("初始化客户端失败")
        return
    }
    //启动websocket连接npm
    ac_client.wsStart();
    ac_client.on("EnterRoomAck", () => {
        console.log("Enter room success!");
    });
    ac_client.on("RecentComment", (comments) => {
        //获得建立连接当前的弹幕列表
        console.log(comments);
    });
    ac_client.on("Comment", (danmaku) => {
        //收到的弹幕
        console.log(danmaku);
    });

    ac_client.on("Like", (like) => {
        //收到的点赞
        console.log(like);
    });

    ac_client.on("Gift", (gift) => {
        //收到的礼物
        console.log(gift);
    });
    /*
    ac_client.on("UnknownAction", (msg) => {
        console.log(msg.data || msg.signalType);
    });
    ac_client.on("UnknownState", (msg) => {
        console.log(msg.data || msg.signalType);
    });
    */
});