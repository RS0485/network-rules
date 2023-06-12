# network-rules
Clash(Stash)/Quantumult X rules and scripts

![last commit](https://img.shields.io/github/last-commit/RS0485/network-rules)
[![Telegram](https://img.shields.io/badge/Telegram-Group-33A8E3)](https://t.me/rs0485_discussions)

## 重写模块
### Quantumult X
- [Quantumult X 资源解析器](https://github.com/RS0485/network-rules/tree/main/resource/README.md) - **Quantumult X直接订阅Clash规则、从`bgp.he.net`直接生成任意国家或地区的`IP-ASN`规则**
- [IP信息解析脚本](https://github.com/RS0485/network-rules/tree/main/resource/geolocation-parser.js)
- [IPv6 连接测试](https://github.com/RS0485/network-rules/tree/main/scripts/ipv6-check.js)
- [Clash Insight](https://github.com/RS0485/network-rules/blob/main/scripts/clash-insight.md)
- [New Bing 聊天修复](https://github.com/RS0485/network-rules/tree/main/rewrite/TheNewBing.qx.conf)

### Stash
- [Stash Insight](https://github.com/RS0485/network-rules/blob/main/scripts/clash-insight.md)
- [实时油价查询](https://github.com/RS0485/network-rules/tree/main/rewrite/GasPrice.stoverride)
- [直连+代理IP地址信息](https://github.com/RS0485/network-rules/tree/main/rewrite/IPGeolocation.stoverride)
- [New Bing 聊天修复](https://github.com/RS0485/network-rules/tree/main/rewrite/TheNewBing.stoverride)
- [Fake IP Fixer](https://github.com/RS0485/network-rules/tree/main/rewrite/FakeIPFixer.stoverride)
- [Block Bad UDP](https://github.com/RS0485/network-rules/tree/main/rewrite/BlockBadUDP.stoverride)

## 规则集预处理服务
Clash 规则集预处理服务是一个运行于 Cloudflare Pages 平台的网络服务，主要用于订阅规则的预处理，包括规则集清单网页、GitHub 反代、规则集合并等功能。

<details><summary>部署说明</summary>

1. Fork 此项目。
2. 将 GitHub 账户关联到 Cloudflare，使用 `Connect to Git` 方式新建一个 `Cloudflare Pages` 项目，选择 Fork 的 Repo。
3. 部署完成后可以通过浏览器访问 `Cloudflare Pages` 的域名链接 `xx.pages.dev`。
4. 建议绑定自定义域名，避免 `pages.dev` 被阻断导致不可访问。例如，绑定域名为 `example.com`，下文均以此为例说明。
5. 如果需要使用定制化功能，需要绑定一个名为 `NETWORK_RULES` 的 `KV` 用来存储设置和数据。
</details>

<details><summary>规则清单网页</summary>

该功能提供一个规则清单和搜索网页，展示 `https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/` 目录下的所有Clash分流规则集的详细信息。通过 `https://example.com/rulesets/` 进行访问。
</details>

<details><summary>规则集反代</summary>

该功能将订阅链接的 `https://raw.githubusercontent.com/` 替换成 `https://example.com/gh/`，以便直连直接访问。例如，`https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/baidu.yaml` 的反代链接为 `https://example.com/gh/RS0485/V2rayDomains2Clash/generated/baidu.yaml`。

提示：可改写反代的原始文本内容，使用方法是在URL后面加请求参数，例如 `?encodeURIComponent(originalText)=encodeURIComponent{replaceText}`
</details>

<details><summary>规则集合并</summary>

在 Clash 中，同一个策略（policy）可能包含多个规则集，例如 PROXY 策略可能包含 Google、Twitter、GitHub 等等。实际情况中，可能有很多这样的规则集，会导致 Clash 为每个规则集生成一颗搜索树，从而降低规则匹配的效率。

我们可以将多个订阅的规则集内容合并成一个大的规则集，从而减少搜索树的数量，提高规则匹配效率，并且方便管理。

规则合并的参数需手动添加到 `KV`，Key 为订阅的 `URI`，Value 为规则清单网址，一行一条，示例如下：

| key | Value | 订阅URL |
| :-----| :---- | :---- |
| /rulesets/merged/unblock.yaml | https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/openai.yaml<br>https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/bing.yaml | https://example.com/rulesets/merged/unblock.yaml |
| /rulesets/merged/proxy-cidr.yaml | https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/telegram-cidr.yaml<br>https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare-cidr-ipv4.yaml<br>https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare-cidr-ipv6.yaml<br>https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/dns-polluted-ips.yaml | https://example.com/rulesets/merged/proxy-cidr.yaml |


规则集支持 `domain`、`ipcidr` 和 `classic` 三种格式，合并的规则集必须使用同一种格式，否则合并后的规则集将无法使用！
</details>

<details><summary>生成ASN规则集</summary>

可以直接生成 Stash 格式的ASN规则的覆写订阅，实时的ASN数据来自 `bgp.net`。

订阅链接格式为 `https://example.com/rulesets/asns/{countryOrRegion}?policy=${policy}`，其中 `countryOrRegion`为国家或地区代码，`policy` 为策略。例如 `https://example.com/rulesets/asns/HK?policy=PROXY` 表示生成香港ASN规则，策略为代理，内容如下：

```
name: Stash ASN rules for HK
desc: policy=PROXY, countryOrRegion=HK, count=693
# author: @RS0485
# generated on: 2023-05-11T11:12:13.123Z

payload:
  - "IP-ASN,63927,PROXY,no-resolve"
  - "IP-ASN,9304,PROXY,no-resolve"
  - "IP-ASN,4637,PROXY,no-resolve"
...
```
</details>

<details><summary>将hosts转换为Clash规则集</summary>

直接将 `hosts` 文件的内容转换为 Clash 规则集。

订阅链接格式为 `https://example.com/rulesets/hosts?url=${hostsURL}`，其中 `hostsURL` 为 `hosts` 的地址。例如 `https://example.com/rulesets/hosts?url=https://raw.githubusercontent.com/Skimige/AntiMakedingHosts/master/hosts`。

</details>

<details><summary>生成任意内容的规则集</summary>

将任意文本内容生成规则集订阅链接。需要需手动添加到 `KV`，Key 为订阅的 `URI`，Value 为订阅的内容。

| key | Value | 订阅URL |
| :-----| :---- | :---- |
| /rulesets/custom/proxy.yaml | <pre>payload:<br>  - "+.nicegram.app"<br>  - "+.nicegram.cloud"</pre> | https://example.com/rulesets/custom/proxy.yaml |
</details>

<details><summary>生成任意内容的订阅</summary>

将文本内容生成任意APP的订阅链接。需要需手动添加到 `KV`，Key 为订阅的 `URI`，Value 为订阅的内容。

| key | Value | 订阅URL |
| :-----| :---- | :---- |
| /raw/rewrite/blockads.stoverride | <pre>name: Block Ads<br>desc: Block ads by rewriting URLs<br>http:<br>  mitm:<br>    - 'example.com'<br>  rewrite:<br>    - '^https?:\/\/example\.com\/online_ad - reject-dict'<br></pre> | https://example.com/raw/rewrite/blockads.stoverride  |

注意：`/raw` 目录的订阅内容需要授权才能访问，可以在Stash等APP的配置文件里添加自动授权：
```
http:
  mitm:
    - 'example.com'
  header-rewrite:
    - '^https?:\/\/example\.com\/raw\/ request-add Authorization Bearer btoa('plain token')'
```
</details>
