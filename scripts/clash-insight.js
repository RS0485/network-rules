/*
 * Clash Insight(Clash网络流量统计分析)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.6
 * @description 分析Clash的连接信息并给出配置优化建议，兼容Stash和Clash客户端
 *
 * 脚本参数格式: name,output_format,api_addr,api_token,server_type
 *   - name:            Clash API服务器的名称
 *   - output_format:   指定脚本执行后的输出, tile-Stash小组件 html-html网页 json-json数据用于二次开发
 *   - api_addr:        Clash API地址
 *   - api_token:       API token
 *   - server_type:     Clash API服务器的类型, stash 或 clash
 */

const version = '1.0.6'

const ServerTypes = {
    Stash: "stash",
    Clash: "clash"
}

const OutputFormats = {
    Tile: "tile",
    Html: "html",
    Json: "json"
}

var settings = {
    server_name: 'Stash iOS',
    output_format: OutputFormats.Html,
    api_addr: 'http://localhost:9090/connections',
    api_token: '',
    server_type: ServerTypes.Stash
}

var parameter = 'Stash iOS,tile,http://localhost:9090/connections,api_token1234,stash'
if (typeof $argument !== 'undefined' && $argument !== '') {
    parameter = $argument
}
const params = parameter.split(',')
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
        settings.server_type = params[4] == 'clash' ? ServerTypes.Clash : ServerTypes.Stash
    }
    else {
        settings.server_type = ServerTypes.Stash
    }
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

function convert_connection_object(src_connections, server_type) {
    // 将Stash/Clash 对象转换成通用对象
    common_connections = []

    src_connections.forEach(src_connection => {
        const common_connection = {
            start: src_connection.start,
            network: src_connection.metadata.network,
            host: src_connection.metadata.host,
            destinationIP: src_connection.metadata.destinationIP,
            destinationPort: src_connection.metadata.destinationPort,
            rule: src_connection.rule,
            rulePayload: src_connection.rulePayload,
            chains: src_connection.chains,

            upload: server_type === ServerTypes.Stash ? src_connection.upload.total : src_connection.upload,
            download: server_type === ServerTypes.Stash ? src_connection.download.total : src_connection.download,
            dns_resolve_time: server_type === ServerTypes.Stash ?
                (src_connection.metadata.tracing.hasOwnProperty("dnsQuery") ? src_connection.metadata.tracing.dnsQuery : 0) : -1,
            connect_time: server_type === ServerTypes.Stash ?
                (src_connection.metadata.tracing.hasOwnProperty("connect") ? src_connection.metadata.tracing.connect : 0) : -1,
            handshake_time: server_type === ServerTypes.Stash ?
                (src_connection.metadata.tracing.hasOwnProperty("handshake") ? src_connection.metadata.tracing.handshake : 0) : -1
        }

        common_connections.push(common_connection)
    })

    return common_connections
}

function perform_analysis(content, server_type) {
    const json_data = JSON.parse(content)

    const active_connections = json_data.connections.length
    const upload_traffic = format_traffic(json_data.uploadTotal)
    const download_traffic = format_traffic(json_data.downloadTotal)

    // DNS 分析
    // 触发DNS解析的记录
    var dns_resolved = []
    // 平均DNS解析时间
    var avg_resolve_time = -1
    if (server_type === ServerTypes.Stash) {
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

    // 未匹配规则的记录
    // 数量越多说明规则越不完善
    const final_matched = json_data.connections.filter(c => (c.rule === 'MATCH' || c.rule === 'Match'))

    // 网络类型分析
    const network_tcp = json_data.connections.filter(c => (c.metadata.network === 'TCP' || c.metadata.network === 'tcp'))
    const network_udp = json_data.connections.filter(c => (c.metadata.network === 'UDP' || c.metadata.network === 'udp'))
    const network_http = json_data.connections.filter(c => (c.metadata.network === 'HTTP' || c.metadata.network === 'HTTPS'
        || c.metadata.network === 'http' || c.metadata.network === 'https'))

    return {
        active_connections: active_connections,
        upload_traffic: upload_traffic,
        download_traffic: download_traffic,
        dns_resolved: dns_resolved.length,
        avg_resolve_time: {
            value: avg_resolve_time,
            unit: 'ms'
        },
        connections: {
            redundant_dns: convert_connection_object(redundant_dns, server_type),
            final_matched: convert_connection_object(final_matched, server_type),
            network_tcp: convert_connection_object(network_tcp, server_type),
            network_udp: convert_connection_object(network_udp, server_type),
            network_http: convert_connection_object(network_http, server_type)
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

    node_content += '<table border="1" cellpadding="10">'
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

function generate_html(ana_result) {
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

        active_connection_table.push([
            '上传',
            '下载',
            '活跃连接',
            'DNS解析',
            '平均DNS解析时间'])

        active_connection_table.push([
            `${ana_result.upload_traffic.value} ${ana_result.upload_traffic.unit}`,
            `${ana_result.download_traffic.value} ${ana_result.download_traffic.unit}`,
            `${ana_result.active_connections}`,
            `${ana_result.dns_resolved}`,
            `${ana_result.avg_resolve_time.value} ${ana_result.avg_resolve_time.unit}`])

        html += create_table_node('统计信息', '', '', active_connection_table)
    }

    const create_insight_node = (title, description, tips, connections) => {
        var insight_table = []

        insight_table.push([
            '#',
            'network',
            'host',
            'destination',
            'rule',
            'outbound',
            'traffic',
            'dns resolve time'])

        var idx = 0
        connections.forEach(record => {
            idx++
            const upload = format_traffic(record.upload)
            const download = format_traffic(record.download)

            insight_table.push([
                idx,
                `${record.network}`,
                `${record.host}`,
                `${record.destinationIP}:${record.destinationPort}`,
                `${record.rule}: ${record.rulePayload}`,
                `${record.chains[0]}`,
                `↑ ${upload.value} ${upload.unit}  ↓ ${download.value} ${download.unit}`,
                `${record.dns_resolve_time} ms`])
        })

        return create_table_node(title, description, tips, insight_table)
    }

    html += create_insight_node(
        '不必要的DNS解析',
        '以下域名的最终出口为代理，不需要在本地进行DNS解析，<b>列表中的域名浪费了一次DNS解析时间</b>。',
        '当数量较多时可能会导致网速变慢，建议进行优化，例如在规则列表将IP相关的规则放在域名规则后面(或者添加no-resolve避免DNS解析)、将常用域名添加到代理规则等。',
        ana_result.connections.redundant_dns)

    html += create_insight_node(
        '未命中规则',
        '以下请求未命中任何规则，触发了最终的<b>MATCH</b>。',
        '这种情况一般会触发DNS解析(如果规则列表包含IP相关的规则)，建议将常用的代理域名添加到规则列表以节省DNS解析时间。',
        ana_result.connections.final_matched)

    {
        var active_connection_table = []

        active_connection_table.push([
            'TCP',
            'UDP',
            'HTTP(S)'])

        active_connection_table.push([
            `${ana_result.connections.network_tcp.length}`,
            `${ana_result.connections.network_udp.length}`,
            `${ana_result.connections.network_http.length}`])

        html += create_table_node('活跃连接', '', '', active_connection_table)
    }

    html += create_insight_node(
        '',
        '活跃UDP连接',
        'UDP连接必须使用真实的IP地址，如果列表中的destination为fake-ip(198.18.x.x)，建议将域名添加到fake-ip-filter，否则无法连接！',
        ana_result.connections.network_udp)


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

function generate_json(ana_result) {
    return {
        version: version,
        server_name: settings.server_name,
        server_type: settings.server_type,
        api_addr: settings.api_addr,
        payload: ana_result
    }
}

$httpClient.get(
    {
        url: settings.api_addr,
    }, (error, response, data) => {
        if (error) {
            done({});
        }
        else {
            const json_data = perform_analysis(data, settings.server_type)

            if (settings.output_format === OutputFormats.Json) {
                const content = generate_json(json_data)

                $done({
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Served-By': `Clash Insight v${version}`
                    }, body: JSON.stringify(content)
                });
            }
            else if (settings.output_format === OutputFormats.Html) {
                const content = generate_html(json_data)

                $done({
                    status: 200,
                    headers: {
                        'Content-Type': 'text/html;charset=UTF-8',
                        'Served-By': `Clash Insight v${version}`
                    }, body: content
                });
            }
            else {
                const content = generate_tile(json_data)

                $done(content);
            }
        }
    });
