/*
 * Clash Insight(Clash网络流量统计分析)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.1.3
 * @description 分析Clash的连接信息并给出配置优化建议，兼容Stash和Clash客户端，支持被Stash和Quantumult X调用
 *
 * 使用方式:
 *   > Stash
 *     1. 添加覆写，可分析Stash APP连接信息 https://raw.githubusercontent.com/RS0485/network-rules/main/rewrite/StashInsight.stoverride
 *     2. 如需分析其它clash客户端的信息，可新建一个覆写，并添重写规则，示例:
 *      - match: ^https?://clash.insight:9090/html/myclash$
 *        name: clash-insight
 *        type: response
 *        require-body: false
 *        timeout: 5
 *        debug: false
 *        argument: 'My Clash,html,http://myclash_address/connections,,clash'
 * 
 *   > Quantumult X
 *     1. 添加Clash Insight到remote_rewrite订阅:
 *       https://raw.githubusercontent.com/RS0485/network-rules/main/rewrite/ClashInsight.qx.conf, tag=My Clash Insight, update-interval=259200, enabled=true
 *     2. 在Quantumult X的iCloud目录的配置文件 "RS0485/clash-insight.txt"设置参数(首次运行自动创建)，内容示例: My Clash,html,http://myclash_address/connections,,clash
 * 
 * 参数格式: name,output_format,api_addr,api_token,api_type
 *   - name:            Clash 客户端的名称
 *   - output_format:   指定脚本执行后的输出, tile-Stash小组件 html-html网页 json-json数据用于二次开发
 *   - api_addr:        Clash API地址
 *   - api_token:       API token
 *   - api_type:        Clash 客户端的类型, 支持 stash 或 clash
 * 
 * Change Logs:
 *   - v1.1.3: 添加异常DNS解析时间分析
 *   - v1.1.4: 分析之前过滤REJECT和本地连接
 * 
 */

const version = '1.1.4'

const APITypes = {
    Stash: "stash",
    Clash: "clash"
}

const OutputFormats = {
    Tile: "tile",
    Html: "html",
    Json: "json"
}

const Runtimes = {
    Default: "default",
    QuantumultX: "quan",
    Stash: "stash"
}

var runtime = Runtimes.Default
if (typeof $notify !== 'undefined' && typeof $task !== 'undefined') {
    runtime = Runtimes.QuantumultX
}
if (typeof $environment !== 'undefined' && typeof $environment["stash-version"] !== 'undefined') {
    runtime = Runtimes.Stash
}

var settings = {
    server_name: 'Stash iOS',
    output_format: OutputFormats.Html,
    api_addr: 'http://localhost:9090/connections',
    api_token: '',
    api_type: APITypes.Stash
}

// 配置参数: Stash从argument获取，Quantumult X从iCloud文件读取
var parameter = 'Stash iOS,tile,http://localhost:9090/connections,api_token1234,stash'
if (runtime === Runtimes.Stash) {
    if (typeof $argument !== 'undefined' && $argument !== '') {
        parameter = $argument
    }
}
else {
    const config_file = 'RS0485/clash-insight.txt'
    const read_bytes = $iCloud.readFile(config_file)

    if (read_bytes === undefined) {
        const write_bytes = new TextEncoder().encode('My Clash,html,http://myclash_address/connections,my_api_token,clash')

        if ($iCloud.writeFile(write_bytes, config_file)) {
            console.log(`config file ${config_file} was created on icloud storage, please set parameters to this file.`)
        } else {
            console.log(`config file ${config_file} not found on icloud storage, failed to create a new one!`)
        }

        $done({})
    } else {
        parameter = new TextDecoder().decode(read_bytes).split('\n')[0];
    }
}
const params = parameter.split(',').map(function (item) {
    return item.trim();
})
if (params.length >= 4) {
    settings.server_name = params[0]

    if (params[1] === 'tile') {
        settings.output_format = OutputFormats.Tile
    }
    else if (params[1] === 'html') {
        settings.output_format = OutputFormats.Html
    }
    else {
        settings.output_format = OutputFormats.Json
    }

    settings.api_addr = params[2]
    settings.api_token = params[3]

    // 最初发布的版本没有这个字段，采用下面的逻辑往前兼容
    if (params.length > 4) {
        settings.api_type = params[4] == 'clash' ? APITypes.Clash : APITypes.Stash
    }
    else {
        settings.api_type = APITypes.Stash
    }
}
else {
    console.log(`invalid parameter: ${parameter}`)
    $done({})
}

function format_traffic(traffic_in_bytes) {
    const KB = 1000
    const MB = 1000 * 1000
    const GB = 1000 * 1000 * 1000

    var friendly_traffic = 0
    var friendly_unit = 'B'

    if (traffic_in_bytes < KB) {
        friendly_traffic = traffic_in_bytes
        friendly_unit = 'B';
    }
    else if (traffic_in_bytes >= KB && traffic_in_bytes < MB) {
        friendly_traffic = traffic_in_bytes / KB
        friendly_unit = 'KB';
    }
    else if (traffic_in_bytes >= MB && traffic_in_bytes < GB) {
        friendly_traffic = traffic_in_bytes / MB
        friendly_unit = 'MB';
    }
    else {
        friendly_traffic = traffic_in_bytes / GB
        friendly_unit = 'GB';
    }

    return {
        value: friendly_traffic.toFixed(2),
        unit: friendly_unit
    }
}

function convert_connection_object(src_connections, api_type) {
    if (typeof src_connections === 'undefined') {
        return undefined
    }

    // 将Stash/Clash 对象转换成通用对象
    common_connections = []

    src_connections.forEach(src_connection => {
        const common_connection = {
            start: src_connection.start,
            network: src_connection.metadata.network,
            host: src_connection.metadata.host,
            sourceIP: src_connection.metadata.sourceIP,
            sourcePort: src_connection.metadata.sourcePort,
            destinationIP: src_connection.metadata.destinationIP,
            destinationPort: src_connection.metadata.destinationPort,
            rule: src_connection.rule,
            rulePayload: src_connection.rulePayload,
            chains: src_connection.chains,

            upload: api_type === APITypes.Stash ? src_connection.upload.total : src_connection.upload,
            download: api_type === APITypes.Stash ? src_connection.download.total : src_connection.download,
            dns_resolve_time: api_type === APITypes.Stash ?
                (src_connection.metadata.tracing.hasOwnProperty("dnsQuery") ? src_connection.metadata.tracing.dnsQuery : 0) : -1,
            connect_time: api_type === APITypes.Stash ?
                (src_connection.metadata.tracing.hasOwnProperty("connect") ? src_connection.metadata.tracing.connect : 0) : -1,
            handshake_time: api_type === APITypes.Stash ?
                (src_connection.metadata.tracing.hasOwnProperty("handshake") ? src_connection.metadata.tracing.handshake : 0) : -1
        }

        common_connections.push(common_connection)
    })

    return common_connections
}

function perform_analysis(content, api_type) {
    const json_data = JSON.parse(content)

    json_data.connections.sort(function (a, b) {
        return new Date(b.start) - new Date(a.start)
    })

    // 最近10个请求
    const recent_requests = json_data.connections.slice(0, 10)

    // 排除本地连接
    json_data.connections = json_data.connections.filter(function (con) {
        return con.metadata.host !== 'localhost' && con.metadata.host !== 'clash.insight' && con.metadata.destinationIP !== '127.0.0.1'
    })

    const active_connections = json_data.connections.length
    const upload_traffic = format_traffic(json_data.uploadTotal)
    const download_traffic = format_traffic(json_data.downloadTotal)

    const rejected_requests = json_data.connections.filter(c => c.chains[0] === 'REJECT')

    // 以下的分析数据不包含REJECT
    json_data.connections = json_data.connections.filter(c => c.chains[0] !== 'REJECT')
    

    // 触发DNS解析的记录
    var dns_resolved = []
    var avg_resolve_time = -1
    if (api_type === APITypes.Stash) {
        dns_resolved = json_data.connections.filter(c => c.metadata.tracing.hasOwnProperty("dnsQuery"))
        if (dns_resolved.length > 0) {
            const sum = dns_resolved.reduce((acc, curr) => acc + curr.metadata.tracing.dnsQuery, 0)
            avg_resolve_time = (sum / dns_resolved.length).toFixed(2)
        }
    }
    else {
        dns_resolved = json_data.connections.filter(c => (c.metadata.host !== '' && c.metadata.destinationIP !== ''))
        avg_resolve_time = -1
    }

    // 非必要的DNS解析: 最终出口不是'DIRECT'时走代理，但是该记录触发了DNS解析来匹配规则, 最优的策略是代理的域名不需要DNS解析时间
    // 数量越少越好，当数量比较多时建议对规则进行优化
    const redundant_dns = dns_resolved.filter(c => c.chains[0] !== 'DIRECT')

    // 异常的DNS解析时间：> 120ms
    var abnormal_dns_resolved //= []
    if (api_type === APITypes.Stash) {
        abnormal_dns_resolved = dns_resolved.filter(c => c.metadata.tracing.dnsQuery > 120)
    }

    // 未匹配规则的记录
    // 数量越多说明规则越不完善
    const final_matched = json_data.connections.filter(c => (c.rule === 'MATCH' || c.rule === 'Match'))

    // 网络类型分类
    const network_tcp = json_data.connections.filter(c => (c.metadata.network === 'TCP' || c.metadata.network === 'tcp'))
    const network_udp = json_data.connections.filter(c => (c.metadata.network === 'UDP' || c.metadata.network === 'udp'))
    const network_http = json_data.connections.filter(c => (c.metadata.network === 'HTTP' || c.metadata.network === 'HTTPS'
        || c.metadata.network === 'http' || c.metadata.network === 'https'))

    // 平均TCP 连接时间分析: TCP+HTTPS
    var avg_tcp_connect_time = -1
    if (api_type === APITypes.Stash && (network_tcp.length > 0 || network_http.length > 0)) {
        const sum_tcp = network_tcp.reduce((acc, curr) => acc + curr.metadata.tracing.connect, 0)
        const sum_http = network_http.reduce((acc, curr) => acc + curr.metadata.tracing.connect, 0)

        avg_tcp_connect_time = ((sum_tcp + sum_http) / (network_tcp.length + network_http.length)).toFixed(2)
    }

    // 平均代理握手时间分析
    const proxied_connections = json_data.connections.filter(c => c.chains[0] !== 'DIRECT')
    var avg_proxy_handshake_time = -1
    if (api_type === APITypes.Stash && proxied_connections.length > 0) {
        const sum = proxied_connections.reduce((acc, curr) => acc + (curr.metadata.tracing.hasOwnProperty("handshake") ? curr.metadata.tracing.handshake : 0), 0)
        avg_proxy_handshake_time = (sum / proxied_connections.length).toFixed(2)
    }

    return {
        active_connections: active_connections,
        upload_traffic: upload_traffic,
        download_traffic: download_traffic,
        dns_resolved: dns_resolved.length,
        avg_resolve_time: {
            value: avg_resolve_time,
            unit: 'ms'
        },
        avg_tcp_connect_time: {
            value: avg_tcp_connect_time,
            unit: 'ms'
        },
        avg_proxy_handshake_time: {
            value: avg_proxy_handshake_time,
            unit: 'ms'
        },
        connections: {
            redundant_dns: convert_connection_object(redundant_dns, api_type),
            final_matched: convert_connection_object(final_matched, api_type),
            abnormal_dns_resolved: convert_connection_object(abnormal_dns_resolved, api_type),
            rejected_requests: convert_connection_object(rejected_requests, api_type),
            network_tcp: convert_connection_object(network_tcp, api_type),
            network_udp: convert_connection_object(network_udp, api_type),
            network_http: convert_connection_object(network_http, api_type),
            proxied_connections: convert_connection_object(proxied_connections, api_type),
            recent_requests: convert_connection_object(recent_requests, api_type)
        }
    }
}

function create_table_node(title, description, tips, rows) {
    var node_content = ''

    if (title !== '') {
        node_content += `<h3>${title}</h3>`
    }

    if (description !== '') {
        node_content += `<p>${description}</p>`
    }

    if (tips !== '') {
        node_content += `<p>${tips}</p>`
    }

    node_content += '<table border="1" cellpadding="5">'
    node_content += '<tbody>'

    rows.forEach(row => {
        node_content += '<tr>'
        row.forEach(cell => {
            node_content += `<td>${cell}</td>`
        })
        node_content += '</tr>'
    });

    node_content += '</tbody></table>\n'

    return node_content
}

function generate_html(ana_result, settings) {
    const suffix = `<!DOCTYPE html>
<html>

<head>
    <title>
    Clash Insight by RS0485
    </title>
</head>

<body>
    <h1>${settings.server_name} <span style="background-color: #000000; color: #00FF00; padding: 5px 5px;">Insight</span></h1>
    <p>v${version} by <a title="Visit source code on github" href="https://github.com/RS0485/network-rules">RS0485</a> </p>`

    const prefix = '</body> </html>'

    var html = suffix

    {
        var active_connection_table = []

        if (settings.api_type === APITypes.Stash) {
            active_connection_table.push([
                '上传',
                '下载',
                '活跃连接',
                'DNS解析',
                '平均DNS解析时间',
                'TCP连接数',
                '平均TCP连接时间',
                '代理连接数',
                '平均代理握手时间'])

            active_connection_table.push([
                `${ana_result.upload_traffic.value} ${ana_result.upload_traffic.unit}`,
                `${ana_result.download_traffic.value} ${ana_result.download_traffic.unit}`,
                `${ana_result.active_connections}`,
                `${ana_result.dns_resolved}`,
                `${ana_result.avg_resolve_time.value} ${ana_result.avg_resolve_time.unit}`,
                `${ana_result.connections.network_tcp.length + ana_result.connections.network_http.length}`,
                `${ana_result.avg_tcp_connect_time.value} ${ana_result.avg_tcp_connect_time.unit}`,
                `${ana_result.connections.proxied_connections.length}`,
                `${ana_result.avg_proxy_handshake_time.value} ${ana_result.avg_proxy_handshake_time.unit}`])
        }
        else {
            active_connection_table.push([
                '上传',
                '下载',
                '活跃连接',
                'DNS解析'])

            active_connection_table.push([
                `${ana_result.upload_traffic.value} ${ana_result.upload_traffic.unit}`,
                `${ana_result.download_traffic.value} ${ana_result.download_traffic.unit}`,
                `${ana_result.active_connections}`,
                `${ana_result.dns_resolved}`])
        }

        html += create_table_node('统计信息', '', '', active_connection_table)
    }

    const create_insight_node = (title, description, tips, connections, api_type) => {
        var insight_table = []

        if (api_type === APITypes.Stash) {
            insight_table.push([
                '#',
                'network',
                'host',
                'destination',
                'rule',
                'outbound',
                'traffic',
                'dns resolve',
                'connect',
                'handshake'])
        }
        else {
            insight_table.push([
                '#',
                'network',
                'host',
                'source',
                'destination',
                'rule',
                'outbound',
                'traffic'])
        }

        var idx = 0
        connections.forEach(record => {
            idx++
            const upload = format_traffic(record.upload)
            const download = format_traffic(record.download)

            if (api_type === APITypes.Stash) {
                insight_table.push([
                    idx,
                    `${record.network}`,
                    `${record.host}`,
                    `${record.destinationIP}:${record.destinationPort}`,
                    `${record.rule}: ${record.rulePayload}`,
                    `${record.chains[0]}`,
                    `↑ ${upload.value} ${upload.unit}  ↓ ${download.value} ${download.unit}`,
                    `${record.dns_resolve_time} ms`,
                    `${record.connect_time} ms`,
                    `${record.handshake_time} ms`])
            }
            else {
                insight_table.push([
                    idx,
                    `${record.network}`,
                    `${record.host}`,
                    `${record.sourceIP}:${record.sourcePort}`,
                    `${record.destinationIP}:${record.destinationPort}`,
                    `${record.rule}: ${record.rulePayload}`,
                    `${record.chains[0]}`,
                    `↑ ${upload.value} ${upload.unit}  ↓ ${download.value} ${download.unit}`])
            }
        })

        return create_table_node(title, description, tips, insight_table)
    }

    if (typeof ana_result.connections.recent_requests !== 'undefined') {
        html += create_insight_node(
            '最近请求',
            '以下是最近的10个请求。',
            '',
            ana_result.connections.recent_requests, settings.api_type)
    }

    if (typeof ana_result.connections.redundant_dns !== 'undefined') {
        html += create_insight_node(
            '不必要的DNS解析',
            '以下域名的最终出口为代理，不需要在本地进行DNS解析，<b>列表中的域名浪费了一次DNS解析时间</b>。',
            '当数量较多时可能会导致网速变慢，建议进行优化，例如在规则列表将IP相关的规则放在域名规则后面(或者添加no-resolve避免DNS解析)、将常用域名添加到代理规则等。',
            ana_result.connections.redundant_dns, settings.api_type)
    }

    if (typeof ana_result.connections.abnormal_dns_resolved !== 'undefined') {
        html += create_insight_node(
            '异常的DNS解析时间',
            '以下域名的DNS的解析时间异常(超过120ms)，可能导致首次连接速度较慢。',
            '如果异常数量较多，建议更换成更快的DNS服务器。',
            ana_result.connections.abnormal_dns_resolved, settings.api_type)
    }

    if (typeof ana_result.connections.final_matched !== 'undefined') {
        html += create_insight_node(
            '未命中规则',
            '以下请求未命中任何规则，触发了最终的<b>MATCH</b>。',
            '这种情况一般会触发DNS解析(如果规则列表包含IP相关的规则)，建议将常用的代理域名添加到规则列表以节省DNS解析时间。',
            ana_result.connections.final_matched, settings.api_type)
    }

    {
        var active_connection_table = []

        active_connection_table.push([
            'REJECT',
            'TCP',
            'UDP',
            'HTTP(S)'])

        active_connection_table.push([
            `${ana_result.connections.rejected_requests.length}`,
            `${ana_result.connections.network_tcp.length}`,
            `${ana_result.connections.network_udp.length}`,
            `${ana_result.connections.network_http.length}`])

        html += create_table_node('活跃连接', '', '', active_connection_table)
    }

    if (typeof ana_result.connections.network_udp !== 'undefined') {
        html += create_insight_node(
            '',
            '活跃UDP连接',
            'UDP连接必须使用真实的IP地址，如果列表中的destination为fake-ip(198.18.x.x)，建议将域名添加到fake-ip-filter，否则无法连接！',
            ana_result.connections.network_udp, settings.api_type)
    }

    html += prefix

    return html
}

function generate_tile(ana_result) {
    const active_connections = ana_result.active_connections
    const upload_traffic = ana_result.upload_traffic
    const download_traffic = ana_result.download_traffic
    const redundant_dns = ana_result.connections.redundant_dns

    body = {
        title: `${settings.server_name} Insight`,
        content: `↑ ${upload_traffic.value} ${upload_traffic.unit}   ↓ ${download_traffic.value} ${download_traffic.unit}\n活动连接: ${active_connections}   冗余DNS: ${redundant_dns.length}`,
        icon: "arrow.up.arrow.down.circle.fill"
    }

    return body
}

function generate_json(ana_result, settings) {
    return {
        version: version,
        runtime: runtime,
        server_name: settings.server_name,
        api_type: settings.api_type,
        api_addr: settings.api_addr,
        payload: ana_result
    }
}

function handle_response(data, runtime) {
    try {
        const json_data = perform_analysis(data, settings.api_type)

        if (settings.output_format === OutputFormats.Json) {
            const content = generate_json(json_data, settings)

            $done({
                status: runtime === Runtimes.Stash ? 200 : 'HTTP/1.1 200 OK',
                headers: {
                    'Content-Type': 'application/json',
                    'Served-By': `Clash Insight v${version}`,
                    'Report-To': 'https://github.com/RS0485/network-rules'
                }, body: JSON.stringify(content)
            });
        }
        else if (settings.output_format === OutputFormats.Html) {
            const content = generate_html(json_data, settings)

            $done({
                status: runtime === Runtimes.Stash ? 200 : 'HTTP/1.1 200 OK',
                headers: {
                    'Content-Type': 'text/html;charset=UTF-8',
                    'Served-By': `Clash Insight v${version}`,
                    'Report-To': 'https://github.com/RS0485/network-rules'
                }, body: content
            });
        }
        else {
            const content = generate_tile(json_data)

            $done(content);
        }
    } catch (e) {
        console.log(`handle response error: ${e}`)
        $done({});
    }
}

if (runtime === Runtimes.Stash) {
    $httpClient.get({
        url: settings.api_addr,
        timeout: 3000,
        headers: { 'authorization': `Bearer ${settings.api_token}` },
    }, (error, response, data) => {
        if (error) {
            console.log(`request error: ${error}`)
            $done({})
        }
        else {
            handle_response(data, runtime)
        }
    });
}
else if (runtime === Runtimes.QuantumultX) {
    $task.fetch({
        url: settings.api_addr,
        timeout: 3000,
        headers: { 'authorization': `Bearer ${settings.api_token}` }
    }).then(response => {
        handle_response(response.body, runtime)
    }, reason => {
        console.log(`fetch error: ${reason.error}`)
        $done({})
    })
}
else {
    console.log(`unknown runtime ${runtime}`)

    if (typeof $done !== 'undefined') {
        $done({})
    }
}
