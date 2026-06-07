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

This repository is a static GitHub Pages site, so it cannot safely exchange OAuth codes for tokens by itself. Use one of these patterns:

1. Preferred: deploy an OAuth broker or hosted auth service, then set `brokerBaseUrl` in `site/auth.config.json`. The broker should handle provider secrets, token exchange, session cookies, and redirect back to `https://bravecownofear.github.io/trendfoundry/auth/?tf_auth=ok&provider=...`.
2. Direct authorization preview: set a provider `clientId`, `authorizationEndpoint`, `scope`, and `enabled: true`. This only starts the provider flow; a backend is still required to exchange the returned code.
3. Email login: set `emailSignInEndpoint` to a backend route that sends magic links.

Never commit provider client secrets, OAuth app secrets, signing keys, refresh tokens, or buyer private payment details to this repository.
