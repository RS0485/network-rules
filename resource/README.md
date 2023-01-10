# Quantumult X 资源解析器

此资源转换脚本主要用于将Clash等APP的订阅规则转换成Quantumult X的规则。

## 使用方式
1. 在Quantumult X的配置文件中加入资源解析器
    - GITHUB: `resource_parser_url=https://raw.githubusercontent.com/RS0485/network-rules/main/resource/resource-parser.js`
    - CDN: `resource_parser_url=https://cdn.jsdelivr.net/gh/RS0485/network-rules@main/resource/resource-parser.js`
2. 在订阅连接后面添加解析参数，格式为: `订阅URL`?`参数列表`,`opt-parser=true...`

## 参数说明

### 固定参数
以下几个参数为必填项，其它参数根据 `type`的类型指定。
| 参数  | 参数值             | 说明                      |
| ------- | --------------------- | --------------------------- |
| src     | clash/quan/any      | 源格式, `any`表示任意                |
| dst     | clash/quan/any      | 目标格式, `any`表示任意             |
| type    | server/rule/rewrite/generate   | 订阅源的类型          |

### type=server
暂不支持

### type=rule
用于转换分流规则，需填写以下参数：
| 参数  | 参数值             | 说明                      |
| ------- | --------------------- | --------------------------- |
| subtype | domain/ipcidr/ipasn/mixed | 指定规则的类型 |
| policy  | [policy name]         | 指定分流策略，当`subtype`为IP类型时，可以在policy后面加上`no-resolve`(**用!分隔**)表示不需要DNS解析，例如 `policy=DIRECT!no-resolve` |

#### domain格式的clash规则转换
https://cdn.jsdelivr.net/gh/RS0485/V2rayDomains2Clash@generated/category-ads-all.yaml?src=clash&dst=quan&type=rule&subtype=domain&policy=REJECT, tag=category-ads-all, opt-parser=true, update-interval=259200

#### ipcidr格式的clash规则转换
https://cdn.jsdelivr.net/gh/RS0485/V2rayDomains2Clash@generated/telegram-cidr.yaml?src=clash&dst=quan&type=rule&subtype=ipcidr&policy=PROXY!no-resolve, tag=telegram-cidr, opt-parser=true, update-interval=259200

#### ipasn规则转换
https://raw.githubusercontent.com/VirgilClyne/GetSomeFries/main/ruleset/ASN.China.list?src=any&dst=quan&type=rule&subtype=ipasn&policy=DIRECT, tag=asn-china, opt-parser=true, update-interval=259200

#### ipasn-raw从`bgp.he.net`网页解析生成ASN规则
https://bgp.he.net/country/CN?src=any&dst=quan&type=rule&subtype=ipasn-raw&policy=DIRECT, tag=asn-china, opt-parser=true, update-interval=604800

#### mixed IP/DOMAIN等混合规则
暂不支持

### type=rewrite
暂不支持

### type=generate
该转换类型表示不管源文件是什么内容，直接输出用户指定的内容，适合规则非常少的策略，例如 `GEOIP=LAN`、`GEIIP=CN`等。

| 参数  | 参数值             | 说明                      |
| ------- | --------------------- | --------------------------- |
| content  | 内容        | 使用base64编码的内容，完整的url不超过2048个字符，在线编码工具:[https://www.base64encode.org/](https://www.base64encode.org/) |

#### 规则应用场景(rule)

大多数配置文件会在最后面添加两条GEOIP规则:
```
GEOIP,LAN,DIRECT,no-resolve
GEOIP,CN,DIRECT
```
为了使其优先级最低，不能加在`filter_local`配置部分，而是必须加在`filter_remote`的最后面，这样就需要为这两条规则部署一个专门的配置文件。
使用`generate`方式可以直接在本地生成上述两条规则: https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/local-ips.yaml?src=any&dst=quan&type=generate&content=R0VPSVAsTEFOLERJUkVDVCxuby1yZXNvbHZlCkdFT0lQLENOLERJUkVDVA==, tag=direct rules, opt-parser=true, update-interval=259200

#### 重写应用场景(rewrite)

可生成数量比较少的 `rewrite` 规则，例如
```
hostname = *.google.cn
^https?:\/\/(www?)\.google\.cn url 302 https://www.google.com.hk
```
使用 `generate`的方式生成上述规则:
https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/local-ips.yaml?src=any&dst=quan&type=generate&content=aG9zdG5hbWUgPSAqLmdvb2dsZS5jbgpeaHR0cHM/OlwvXC8od3d3PylcLmdvb2dsZVwuY24gdXJsIDMwMiBodHRwczovL3d3dy5nb29nbGUuY29tLmhr, tag=Google CN, opt-parser=true, update-interval=259200, enabled=true

### 注意事项
1. 本脚本没用自动识别功能，使用时必须正确地指定每一个参数

### 分流规则资源
- [Clash 分流规则](https://github.com/RS0485/V2rayDomains2Clash)
- [IP-ASN 规则](https://github.com/RS0485/IPASNRules)
