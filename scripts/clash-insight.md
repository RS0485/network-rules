# Clash Insight
Stash/Clash网络流量统计分析工具

## 使用说明
### Stash
1. 添加覆写，添加后可分析Stash APP连接信息 https://raw.githubusercontent.com/RS0485/network-rules/main/rewrite/StashInsight.stoverride

2. 如需分析其它clash客户端的信息，可新建一个覆写，并添重写规则，示例:
    ```
    - match: ^https?://clash.insight:9090/html/myclash$
        name: clash-insight
        type: response
        require-body: false
        timeout: 5
        debug: false
        argument: 'My Clash,html,http://myclash_address/connections,,clash'
    ```

### Quantumult X
1. 添加Clash Insight到`remote_rewrite`订阅: https://raw.githubusercontent.com/RS0485/network-rules/main/rewrite/ClashInsight.qx.conf, tag=My Clash Insight, update-interval=259200, enabled=true
2. 在Quantumult X的iCloud目录的配置文件 `RS0485/clash-insight.txt` 设置参数(首次运行自动创建)，内容示例: `My Clash,html,http://myclash_address/connections,,clash`

### Node.js
1. 命令行方式运行: `node clash-insight.js 'My Clash,html,http://myclash_address/connections,,clash'`

## 参数说明
格式: `name,output_format,api_addr,api_token,api_type`

- `name`:            Clash 客户端的名称
- `output_format`:   指定脚本执行后的输出, `tile`-Stash小组件 `html`-html网页 `json`-json数据用于二次开发
- `api_addr`:        Clash API地址
- `api_token`:       API token
- `api_type`:        Clash 客户端的类型, 支持 `stash` 或 `clash`

## Change Logs
- `v1.1.3`: 添加异常DNS解析时间分析
- `v1.1.4`: 分析之前过滤REJECT和本地连接
- `v1.2.0`: 支持NodeJS；代码重构