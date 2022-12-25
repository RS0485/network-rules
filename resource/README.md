## Quantumult X 资源解析器

### 使用方式
 - 格式: `订阅URL`?`参数列表`,`opt-parser=true...`
 - 示例: https://cdn.jsdelivr.net/gh/Kr328/V2rayDomains2Clash@generated/category-ads-all.yaml`?src=clash&dst=quan&type=rule&subtype=domain&policy=REJECT`, tag=category-ads-all, opt-parser=true, update-interval=259200

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