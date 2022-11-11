import ProtoBufJs from "protobufjs";
import AcClient from "../client";
const ROOT = ProtoBufJs.Root.fromJSON(require("../protos.bundle.json"));

const ActionMap = new Map([
  ["CommonActionSignalComment", {event: "Comment"}],  // 弹幕
  ["CommonActionSignalLike", {event: "Like"}],        // 点赞
  ["CommonActionSignalUserEnterRoom", {event: "UserEnterRoom"}],  // 进入房间
  ["CommonActionSignalUserFollowAuthor", {event: "UserFollowAuthor"}],    // 关注主播
  ["AcfunActionSignalThrowBanana", {event: "ThrowBanana"}],      // 投蕉
  ["CommonActionSignalGift", {event: "Gift", process: (gift: any, client: AcClient) => { // 礼物
    gift.value = gift.value.toNumber()
    gift.giftId = gift.giftId.toNumber()
    const { giftName, webpPicList, pngPicList } = client.getGiftInfo(gift.giftId)
    gift.giftName = giftName
    gift.webpPicURL = webpPicList[0].url
    gift.pngPicURL = pngPicList[0].url
    return gift
  }}],
  ["AcfunActionSignalJoinClub", {event: "JoinClub"}],      // 加入守护团
])
  /**
   *
   * @param {Buffer} buffer
   * @param  client
   */
export default function ActionHandler(buffer: ProtoBufJs.Reader | Uint8Array, client: AcClient) {
    const ZtLiveScActionSignal = ROOT.lookupType("ZtLiveScActionSignal");
    let items = (ZtLiveScActionSignal.decode(buffer) as any).item;
    items.forEach((element: { signalType: string; payload: any[]; }) => {
      let action = ActionMap.get(element.signalType)
      if (action) {
        let ProtobufType = ROOT.lookupType(element.signalType)
        element.payload.forEach((e: ProtoBufJs.Reader | Uint8Array) => {
          let result = ProtobufType.decode(e)
          if (action!.process) {
            result = action!.process(result, client)
          }
          client.emit(action!.event, result)
        })
      } else {
        try {
          let ProtobufType = ROOT.lookupType(element.signalType)
          element.payload.forEach((e: ProtoBufJs.Reader | Uint8Array) => {
            let result = ProtobufType.decode(e)
            client.emit("UnknownAction", {signalType: element.signalType, data: result})
          })
        } catch (error) {
          client.emit("UnknownAction", {signalType: element.signalType})
        }
      }
      
    });

  };

