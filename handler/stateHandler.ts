import ProtoBufJs from "protobufjs";
import AcClient from "../client";
const ROOT = ProtoBufJs.Root.fromJSON(require("../protos.bundle.json"));

const StateMap = new Map([
  ["CommonStateSignalRecentComment", {event: "RecentComment"}],
  ["CommonStateSignalDisplayInfo", {event: "DisplayInfo"}],
  ["CommonStateSignalTopUsers", {event: "TopUsers"}],
  ["CommonStateSignalCurrentRedpackList", {event: "CurrentRedpackList"}],
])

  /**
   *
   * @param {Buffer} buffer
   * @param  client
   */
export default function StateHandler(buffer: ProtoBufJs.Reader | Uint8Array, client: AcClient) {
    const ZtLiveScStateSignal = ROOT.lookupType("ZtLiveScStateSignal");
    let items = (ZtLiveScStateSignal.decode(buffer) as any).item;
    items.forEach((element: { signalType: string ; payload: ProtoBufJs.Reader | Uint8Array; }) => {
      let state: any = StateMap.get(element.signalType)
      if (state) {  // 如果StateMap中没有对应的信息，则不处理该信息
        let ProtobufType = ROOT.lookupType(element.signalType)
        let result = ProtobufType.decode(element.payload)
        if (state.process) {
          result = state.process(result, client)
        }
        client.emit(state.event, result)
      } else {
        try {
          let ProtobufType = ROOT.lookupType(element.signalType)
          let result = ProtobufType.decode(element.payload)
          client.emit("UnknownState", {signalType: element.signalType, data: result})
        } catch (error) {
          client.emit("UnknownState", {signalType: element.signalType})
        }
      }
    });
  };
