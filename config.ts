export const config = {
  app_name: "link-sdk",
  sdk_version: "1.2.1",
  app_id: 13,
  client_live_sdk_version: "kwai-acfun-live-link",
  acfun_visitor_sid: "acfun.api.visitor",
  acfun_visitorSt_name: "acfun.api.visitor_st",
  acfun_userSt_name: "acfun.midground.api_st",
  acfun_login_sid: "acfun.midground.api",
  safety_id_content:
    '{"platform":5,"app_version":"2.0.32","device_id":"null","userId":"%d"}',
  kuaishou: {
    subBiz: "mainApp",
    kpn: "ACFUN_APP",
    kpf: "PC_WEB",
  },
};

export const url = {
  LOGIN: "https://www.acfun.cn/login",
  VISITOR_LOGIN: "https://id.app.acfun.cn/rest/app/visitor/login",
  START_PLAY: "https://api.kuaishouzt.com/rest/zt/live/web/startPlay",
  LIVE: "https://live.acfun.cn/",
  WSS_HOST: "wss://klink-newproduct-ws3.kwaizt.com/",
  GIFT_LIST: "https://api.kuaishouzt.com/rest/zt/live/web/gift/list",
  SIGN_IN: "https://id.app.acfun.cn/rest/web/login/signin",
};

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0";
