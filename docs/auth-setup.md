# TrendFoundry Auth Setup

The public site now includes a static account page at https://bravecownofear.github.io/trendfoundry/auth/.

Supported account providers:

- Google: Gmail and Google Workspace accounts.
- Apple: Apple ID and private relay email.
- Microsoft: Outlook, Microsoft 365, and Azure AD.
- GitHub: Developer accounts and public issue buyers.
- Facebook: Meta social login.
- X: Creator and social audience accounts.
- LinkedIn: Professional creator accounts.
- WeChat: WeChat Open Platform QR login.
- QQ: Tencent QQ Connect accounts.
- Weibo: Sina Weibo OAuth login.
- Alipay: Alipay Open Platform authorization.
- DingTalk: Alibaba DingTalk organization accounts.
- Feishu: Feishu and Lark workplace accounts.
- LINE: LINE accounts for Japan and Southeast Asia.

## Production model

This repository can run as static GitHub Pages or as a Node-served site. Static GitHub Pages cannot safely exchange OAuth codes for tokens by itself. The included `npm start` server now exposes a small OAuth broker at `/api/auth` for self-hosted deployments.

1. Static GitHub Pages: leave `site/auth/auth.config.json` public and empty, or point `brokerBaseUrl` to a hosted auth service.
2. Node/self-hosted: run `npm start`. The server dynamically serves `/auth/auth.config.json`, starts provider redirects at `/api/auth/oauth/start/:provider`, receives callbacks at `/api/auth/oauth/callback/:provider`, and exposes `/api/auth/session` plus `/api/auth/logout`.
3. Provider credentials: set environment variables with this shape: `TRENDFOUNDRY_AUTH_GOOGLE_CLIENT_ID`, `TRENDFOUNDRY_AUTH_GOOGLE_CLIENT_SECRET`, `TRENDFOUNDRY_AUTH_WECHAT_CLIENT_ID`, `TRENDFOUNDRY_AUTH_WECHAT_CLIENT_SECRET`, etc. Use the provider id in uppercase. Optional variables: `TRENDFOUNDRY_AUTH_<PROVIDER>_SCOPE`, `TRENDFOUNDRY_AUTH_<PROVIDER>_AUTH_URL`, `TRENDFOUNDRY_AUTH_<PROVIDER>_TOKEN_URL`, `TRENDFOUNDRY_AUTH_<PROVIDER>_USERINFO_URL`.
4. Session signing: set `TRENDFOUNDRY_AUTH_SESSION_SECRET` in production.
5. Email login: connect a mailer to `/api/auth/email` before promising real magic-link delivery.

Never commit provider client secrets, OAuth app secrets, signing keys, refresh tokens, or buyer private payment details to this repository.
