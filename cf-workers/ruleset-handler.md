# ruleset-handler.js
Clash 订阅规则预处理脚本(规则合并、github反代、规则清单网页)，运行于 `Cloudflare Workers`。

## 主要功能
1. 将多个订阅的规则内容合并成一份，以便生成更少的搜索树、提升规则匹配效率
2. 反代 `raw.githubusercontent.com` 以便国内直接访问
3. 将 `https://github.com/RS0485/V2rayDomains2Clash/tree/generated` 的分流规则清单生成网页方便搜索

## 部署
1. 在 `Cloudflare` 的主页面新建一个 `Workers` 服务，命名为 `rulesets`，将 `ruleset-handler.js` 的内容粘贴到代码编辑区，然后点击 `Save and Deploy` 进行部署。
2. 假设 `Workers` 的 `subdomain` 设置为 `example.workers.dev`，那么可通过 `rulesets.example.workers.dev` 访问此服务。
3. 建议绑定自定义域名，避免 `workers.dev` 被阻断导致不可访问。假设绑定域名为 `rulesets.example.com`，文档后续说明均以此为例。

## 规则合并
**为什么要合并规则？**
对于同一个 `policy`，可能包含多个规则集。例如 `PROXY` 策略可能包含如下规则集:
```
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/google.yaml
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/telegram.yaml
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/twitter.yaml
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/spotify.yaml
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/github.yaml
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/gitbook.yaml
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/notion.yaml
...
```
实际情况可能比上面的列表多很多，Clash会为这些规则集分别生成一颗搜索树。这里存在一个问题，类似 `gitbook`、`notion` 这种规则集，包含的规则数量可能还不超过10个，为这种数量极少的规则集分别生成一颗搜索树不太划算，因此建议将这些规则集合并成一个大的规则集，以便提高加载和匹配效率。

本脚本预设4套合并的规则集，分别对应 拦截、代理domain、代理ipcidr、直连：
```
const block_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/category-ads-all.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/category-porn.yaml'
]

const proxy_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/yandex.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/microsoft.yaml',
    ...
]

const proxy_cidr_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/telegram-cidr.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare-cidr-ipv4.yaml',
    ...
]

const direct_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/baidu.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/zhihu.yaml'
]
```
上述各规则集的子规则集可通过更改代码进行设置，并通过以下链接订阅合并后的规则集 (域名 `rulesets.example.com` 只是示例)：
- https://rulesets.example.com/merged-direct.yaml
- https://rulesets.example.com/merged-proxy.yaml
- https://rulesets.example.com/merged-proxy-cidr.yaml
- https://rulesets.example.com/merged-block.yaml

## 规则反代
国内网络无法直接访问 `raw.githubusercontent.com`，本脚本可进行反代，将订阅链接的 `https://raw.githubusercontent.com/` 替换成 `https://rulesets.example.com/gh/` 即可。

例如 `https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/baidu.yaml` 的反代链接为 `https://rulesets.example.com/gh/RS0485/V2rayDomains2Clash/generated/baidu.yaml`

## 规则清单网页
提供一个简单的网页，展示 `https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/`目录下的所有规则清单，通过 `https://rulesets.example.com/` 进行访问，网页内容如下：
```
0x0.yaml   size=242
115.yaml   size=369
1337x.yaml   size=390
17zuoye.yaml   size=290
18comic.yaml   size=444
2kgames.yaml   size=313
36kr.yaml   size=303
...
```

## 注意
- 本文档提到的 `规则集` 特指 `domain` 和 `ipcidr` 两种格式的规则集，不包含 `classic` 格式！
