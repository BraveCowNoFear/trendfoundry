export const AUTH_PROVIDERS = [
  {
    id: "google",
    region: "Global",
    label: "Google",
    description: "Gmail and Google Workspace accounts.",
    scope: "openid email profile",
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo"
  },
  {
    id: "apple",
    region: "Global",
    label: "Apple",
    description: "Apple ID and private relay email.",
    scope: "name email",
    authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
    tokenEndpoint: "https://appleid.apple.com/auth/token",
    profileFromIdToken: true
  },
  {
    id: "microsoft",
    region: "Global",
    label: "Microsoft",
    description: "Outlook, Microsoft 365, and Azure AD.",
    scope: "openid email profile User.Read",
    authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoEndpoint: "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName"
  },
  {
    id: "github",
    region: "Global",
    label: "GitHub",
    description: "Developer accounts and public issue buyers.",
    scope: "read:user user:email",
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    userInfoEndpoint: "https://api.github.com/user"
  },
  {
    id: "facebook",
    region: "Global",
    label: "Facebook",
    description: "Meta social login.",
    scope: "email public_profile",
    authorizationEndpoint: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenEndpoint: "https://graph.facebook.com/v19.0/oauth/access_token",
    userInfoEndpoint: "https://graph.facebook.com/me?fields=id,name,email"
  },
  {
    id: "x",
    region: "Global",
    label: "X",
    description: "Creator and social audience accounts.",
    scope: "users.read tweet.read offline.access",
    authorizationEndpoint: "https://twitter.com/i/oauth2/authorize",
    tokenEndpoint: "https://api.twitter.com/2/oauth2/token",
    userInfoEndpoint: "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
    pkce: true
  },
  {
    id: "linkedin",
    region: "Global",
    label: "LinkedIn",
    description: "Professional creator accounts.",
    scope: "openid profile email",
    authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
    tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoEndpoint: "https://api.linkedin.com/v2/userinfo"
  },
  {
    id: "wechat",
    region: "China",
    label: "WeChat",
    description: "WeChat Open Platform QR login.",
    scope: "snsapi_login",
    authorizationEndpoint: "https://open.weixin.qq.com/connect/qrconnect",
    tokenEndpoint: "https://api.weixin.qq.com/sns/oauth2/access_token",
    userInfoEndpoint: "https://api.weixin.qq.com/sns/userinfo",
    tokenMethod: "GET",
    userInfoMode: "wechat"
  },
  {
    id: "qq",
    region: "China",
    label: "QQ",
    description: "Tencent QQ Connect accounts.",
    scope: "get_user_info",
    authorizationEndpoint: "https://graph.qq.com/oauth2.0/authorize",
    tokenEndpoint: "https://graph.qq.com/oauth2.0/token",
    userInfoEndpoint: "https://graph.qq.com/user/get_user_info",
    tokenMethod: "GET",
    tokenResponse: "query",
    userInfoMode: "qq"
  },
  {
    id: "weibo",
    region: "China",
    label: "Weibo",
    description: "Sina Weibo OAuth login.",
    scope: "email",
    authorizationEndpoint: "https://api.weibo.com/oauth2/authorize",
    tokenEndpoint: "https://api.weibo.com/oauth2/access_token",
    userInfoEndpoint: "https://api.weibo.com/2/users/show.json",
    userInfoMode: "weibo"
  },
  {
    id: "alipay",
    region: "China",
    label: "Alipay",
    description: "Alipay Open Platform authorization.",
    scope: "auth_user",
    authorizationEndpoint: "https://openauth.alipay.com/oauth2/publicAppAuthorize.htm",
    tokenEndpoint: "",
    clientIdParam: "app_id",
    brokerOnly: true
  },
  {
    id: "dingtalk",
    region: "China",
    label: "DingTalk",
    description: "Alibaba DingTalk organization accounts.",
    scope: "openid corpid",
    authorizationEndpoint: "https://login.dingtalk.com/oauth2/auth",
    tokenEndpoint: "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
    userInfoEndpoint: "https://api.dingtalk.com/v1.0/contact/users/me"
  },
  {
    id: "feishu",
    region: "China",
    label: "Feishu",
    description: "Feishu and Lark workplace accounts.",
    scope: "contact:user.base:readonly",
    authorizationEndpoint: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
    tokenEndpoint: "https://open.feishu.cn/open-apis/authen/v1/access_token",
    userInfoEndpoint: "https://open.feishu.cn/open-apis/authen/v1/user_info"
  },
  {
    id: "line",
    region: "Asia",
    label: "LINE",
    description: "LINE accounts for Japan and Southeast Asia.",
    scope: "openid profile email",
    authorizationEndpoint: "https://access.line.me/oauth2/v2.1/authorize",
    tokenEndpoint: "https://api.line.me/oauth2/v2.1/token",
    userInfoEndpoint: "https://api.line.me/oauth2/v2.1/userinfo"
  }
];

export function publicProvider(provider) {
  return {
    id: provider.id,
    region: provider.region,
    label: provider.label,
    description: provider.description,
    scope: provider.scope,
    authUrl: provider.authorizationEndpoint
  };
}

export function providerById(providerId) {
  return AUTH_PROVIDERS.find((provider) => provider.id === providerId);
}

export function providerEnvPrefix(providerId) {
  return `TRENDFOUNDRY_AUTH_${providerId.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`;
}
