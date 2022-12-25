## Quantumult X 资源解析器

### 使用方式
1. 在配置文件引入资源解析器
    - GITHUB: `resource_parser_url=https://raw.githubusercontent.com/RS0485/network-rules/main/resource/resource-parser.js`
    - CDN: `resource_parser_url=https://cdn.jsdelivr.net/gh/RS0485/network-rules@main/resource/resource-parser.js`

2. 在订阅连接后面添加解析器
    - 格式: `订阅URL`?`参数列表`,`opt-parser=true...`
    - 示例: 
      - domain: https://cdn.jsdelivr.net/gh/RS0485/V2rayDomains2Clash@generated/category-ads-all.yaml?src=clash&dst=quan&type=rule&subtype=domain&policy=REJECT, tag=category-ads-all, opt-parser=true, update-interval=259200
      - ipcidr: https://cdn.jsdelivr.net/gh/RS0485/V2rayDomains2Clash@generated/telegram-cidr.yaml?src=clash&dst=quan&type=rule&subtype=ipcidr&policy=PROXY!no-resolve, tag=telegram-cidr, opt-parser=true, update-interval=259200

### 参数说明
| 参数  | 参数值             | 说明                      |
| ------- | --------------------- | --------------------------- |
| src     | clash/quan/surge      | 转换源APP                |
| dst     | clash/quan/surge      | 转换目标APP             |
| type    | server/rule/rewrite   | 订阅源的类型          |
| subtype | domain/ipcidr/classic | `type=rule`时指定规则的类型 |
| policy  | [policy name]         | `type=rule`时指定分流策略 |

### 注意事项
1. 本脚本没用自动识别功能，使用时用户必须正确地指定每一个参数
2. `subtype=ipcidr`时，可以在policy后面加上`no-resolve`(**用!分隔**)，例如 `policy=DIRECT!no-resolve`

### Clash 分流规则
- [V2rayDomains2Clash](https://github.com/RS0485/V2rayDomains2Clash)
