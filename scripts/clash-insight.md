# Clash Insight
Stash/Clash网络流量统计分析工具

## 使用说明
支持以下三种JS平台。

### Stash
1. 添加覆写 `https://raw.githubusercontent.com/RS0485/network-rules/main/rewrite/StashInsight.stoverride`，然后访问 `http://clash.insight/html` 获取Stash APP的网络分析报告。

2. 如需分析其它clash客户端的信息，可新建一个覆写，并添重写规则，示例:
    ```
    - match: ^https?://clash.insight/html/myclash$
        name: clash-insight
        type: response
        require-body: false
        timeout: 5
        debug: false
        argument: 'My Clash,html,http://{myclash_address},,clash'
    ```

### Quantumult X
1. 添加`Clash Insight` 到 `remote_rewrite` 订阅: `https://raw.githubusercontent.com/RS0485/network-rules/main/rewrite/ClashInsight.qx.conf, tag=My Clash Insight, update-interval=259200, enabled=true`
2. 在Quantumult X的iCloud目录的配置文件 `RS0485/clash-insight.txt` 设置参数(**首次运行自动创建**)，内容示例: `My Clash,html,http://myclash_address,,clash`

### Node.js
在本地运行一个web服务，访问时返回本机Clash的分析页面。

1. 安装依赖 `nom install express request`
2. 命令行方式运行: `node clash-insight.js`
3. 访问 `http://127.0.0.1:8000/html` 查看分析页面。

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
- `v1.2.3`: 完善异常处理
- `v1.2.4`: 添加UDP异常诊断，代码优化
- `v1.2.5`: 作为NodeJS的web服务提供本机Clash的分析页面
- `v1.2.6`: 添加代理分析
- `v1.2.7`: HTML页面不区分Clash/Stash，没有的信息显示为NaN
- `v1.2.8`: 优化策略等信息的高亮显示
- `v1.2.9`: 支持识别请求风暴