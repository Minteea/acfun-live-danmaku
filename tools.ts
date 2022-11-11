/*
 * @Date: 2020-09-12 10:57:39
 * @LastEditors: kanoyami
 * @LastEditTime: 2020-09-14 17:58:53
 */
import cookie from "cookie";
import got from "got";
import querystring from "querystring";
import { isArray } from "lodash";
const acConfig = require("./config/config.json");
const acUrl = require("./config/url_set.json");

const getDid = async () => {
  const res = await got(acUrl.acfun_login_main);
  let did_cookie = cookie.parse(res.headers["set-cookie"]![1]);
  return did_cookie._did;
};

const visitorlogin = async (did: string) => {
  const res = await got("https://id.app.acfun.cn/rest/app/visitor/login", {
    method: "POST",
    headers: {
      cookie: "_did=" + did,
    },
    form: {
      sid: acConfig.acfun_visitor_sid,
    },
  });
  const resJson = JSON.parse(res.body);
  if (resJson.result == 0) {
    return {
      acSecurity: resJson["acSecurity"],
      visitorSt: resJson[acConfig.acfun_visitorSt_name],
      userId: resJson["userId"],
    };
  }
};

const userlogin = async (did: string, user: any) => {
  const res = await got(acUrl.acfunSignInURL + "?" + querystring.stringify(
    user,
    "&",
    "="), {
    headers: {
      cookie: "_did=" + did,
    },
    // from: user,
    method: "POST",
  });
  const resJson = JSON.parse(res.body)
  if (resJson.result != 0) {
    throw new Error(resJson.result);
  }
  let acPasstoken = cookie.parse(res.headers["set-cookie"]![0]).acPasstoken;
  let auth_key = cookie.parse(res.headers["set-cookie"]![1]).auth_key;
  const resLogin = await got("https://id.app.acfun.cn/rest/web/token/get?sid=acfun.midground.api", {
    method: "POST",
    headers: {
      cookie: `_did=${did};acPasstoken=${acPasstoken};auth_key=${auth_key}`,
    }
  });
  const resLoginJson = JSON.parse(resLogin.body);
  if (resLoginJson.result == 0) {
    return {
      acSecurity: resLoginJson["ssecurity"],
      visitorSt: resLoginJson["acfun.midground.api_st"],
      userId: resLoginJson["userId"],
    };
  }

}

const startPlayInfo = async (did: any, userId: any, st: any, author_id: any, isLogin: any) => {
  const startPlayUrl =
    acUrl.acfun_kuaishou_zt_startplay +
    querystring.stringify(
      {
        subBiz: acConfig.kuaishou.subBiz,
        kpn: acConfig.kuaishou.kpn,
        userId: userId,
        did: did,
        kpf: acConfig.kuaishou.kpf,
        [isLogin ? acConfig.acfun_userSt_name : acConfig.acfun_visitorSt_name]: st,
      },
      "&",
      "="
    );
  const res = await got(startPlayUrl, {
    method: "POST",
    headers: {
      Referer: acUrl.acfun_live + author_id,
    },
    form: {
      authorId: author_id,
      pullStreamType: "FLV",
    },
  });
  const resJson = JSON.parse(res.body);
  if (resJson.result != 1) {
    throw new Error(resJson.result);
  }
  return resJson.data;
};

const getGiftInfoList = async (did: any, userId: any, st: any, liveId: any, authorId: any, isLogin: any) => {
  const getGiftInfoListURL =
    acUrl.get_kuaishou_zt_giftlist +
    querystring.stringify(
      {
        subBiz: acConfig.kuaishou.subBiz,
        kpn: acConfig.kuaishou.kpn,
        userId: userId,
        did: did,
        kpf: acConfig.kuaishou.kpf,
        [isLogin ? acConfig.acfun_userSt_name : acConfig.acfun_visitorSt_name]: st,
      },
      "&",
      "="
    );
  const res = await got(getGiftInfoListURL, {
    method: "POST",
    headers: {
      Referer: acUrl.acfun_live + authorId,
    },
    form: {
      "visitorId": userId,
      "liveId": liveId
    },
  });
  const resJson = JSON.parse(res.body);
  if (resJson.result != 1) {
    throw new Error(resJson.result);
  }
  return resJson.data;
}
export default { getDid, visitorlogin, startPlayInfo, getGiftInfoList, userlogin };
