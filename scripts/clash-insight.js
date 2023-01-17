/*
 * Clash Insight(Clash网络流量统计分析)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.2.0
 * @description 分析Clash的连接信息并给出配置优化建议，兼容Stash和Clash客户端，支持被Node.js、Stash 和 Quantumult X 调用
 * @readme https://raw.githubusercontent.com/RS0485/network-rules/main/scripts/clash-insight.md
 * 
 */

const version = '1.2.0'

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
    QuantumultX: "quantumultx",
    Stash: "stash",
    NodeJS: "nodejs"
}

class Settings {
    #runtime

    server_name
    output_format
    api_addr
    api_token
    api_type

    constructor(runtime) {
        this.#runtime = runtime
    }

    load() {
        const parameter = this.#get_parameter()
        this.#parse_parameter(parameter)
    }

    /**
     * 配置参数获取
     *  - Stash: 从argument获取
     *  - Quantumult X: 从iCloud文件读取
     *  - NodeJS: 从命令行参数获取
     */
    #get_parameter() {
        var parameter = ''

        if (this.#runtime === Runtimes.Stash) {
            if (typeof $argument !== 'undefined' && $argument !== '') {
                parameter = $argument
            }
            else {
                parameter = 'Stash iOS,tile,http://localhost:9090/connections,api_token1234,stash'
            }
        }
        else if (this.#runtime === Runtimes.QuantumultX) {
            const config_file = 'RS0485/clash-insight.txt'
            const read_bytes = $iCloud.readFile(config_file)

            if (read_bytes === undefined) {
                const write_bytes = new TextEncoder().encode('My Clash,html,http://myclash_address/connections,my_api_token,clash')

                if ($iCloud.writeFile(write_bytes, config_file)) {
                    console.log(`config file ${config_file} was created on icloud storage, please set parameters to this file.`)
                } else {
                    console.log(`config file ${config_file} not found on icloud storage, failed to create a new one!`)
                }
            } else {
                parameter = new TextDecoder().decode(read_bytes).split('\n')[0];
            }
        }
        else if (this.#runtime === Runtimes.NodeJS) {
            if (typeof process.argv !== 'undefined' && process.argv.length >= 3) {
                parameter = process.argv[2]
            }
        }
        else {
            throw `unknown runtime ${this.#runtime}`
        }

        return parameter
    }

    /**
     * 解析参数到成员
     */
    #parse_parameter(parameter) {
        const sections = parameter.split(',').map(function (item) {
            return item.trim();
        })

        if (sections.length < 4) {
            throw `invalid parameter: ${parameter}`
        }

        this.server_name = sections[0]

        if (sections[1] === 'tile') {
            this.output_format = OutputFormats.Tile
        }
        else if (sections[1] === 'html') {
            this.output_format = OutputFormats.Html
        }
        else {
            this.output_format = OutputFormats.Json
        }

        this.api_addr = sections[2]
        this.api_token = sections[3]

        // 最初发布的版本没有这个字段，采用下面的逻辑往前兼容
        if (sections.length > 4) {
            this.api_type = sections[4] == 'clash' ? APITypes.Clash : APITypes.Stash
        }
        else {
            this.api_type = APITypes.Stash
        }
    }
}

class ConnectionInsight {
    constructor() {

    }

    /**
     * 
     * @param {*} api_type 
     * @param {*} content 
     * @returns 
     */
    analysis(api_type, content) {
        const json_data = JSON.parse(content)

        // 排除本地连接
        json_data.connections = json_data.connections.filter(function (con) {
            return con.metadata.host !== 'localhost' && con.metadata.host !== 'clash.insight'
                && con.metadata.destinationIP !== '127.0.0.1'
        })

        const active_connection_count = json_data.connections.length
        const upload_traffic = this.#format_traffic(json_data.uploadTotal)
        const download_traffic = this.#format_traffic(json_data.downloadTotal)

        // 最近10个请求
        json_data.connections.sort(function (a, b) {
            return new Date(b.start) - new Date(a.start)
        })
        const recent_requests = json_data.connections.slice(0, 10)

        const policy = this.#analysis_policy(json_data.connections, api_type)

        // 排除REJECT之后进行后续分析
        json_data.connections = json_data.connections.filter(c => c.chains[0] !== 'REJECT')

        const dns = this.#analysis_dns(json_data.connections, api_type)

        const network = this.#analysis_network(json_data.connections, api_type)

        return {
            active_connection_count: active_connection_count,
            upload_traffic: upload_traffic,
            download_traffic: download_traffic,
            recent_requests: this.#convert_connections(recent_requests),

            policy: policy,
            dns: dns,
            network: network
        }
    }

    /**
     * 将bytes转换成易于理解的形式
     * @param {*} traffic_in_bytes 
     * @returns 
     */
    #format_traffic(traffic_in_bytes) {
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

    /**
     * 将Stash/Clash 对象转换成通用对象
     * @param {*} src_connections 
     * @param {*} api_type 
     * @returns 
     */
    #convert_connections(src_connections, api_type) {
        if (typeof src_connections === 'undefined') {
            return undefined
        }

        var common_connections = []

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

                upload: this.#format_traffic(api_type === APITypes.Stash ? src_connection.upload.total : src_connection.upload),
                download: this.#format_traffic(api_type === APITypes.Stash ? src_connection.download.total : src_connection.download),
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

    /**
     * DNS分析
     * @param {*} connections 
     * @param {*} api_type 
     */
    #analysis_dns(connections, api_type) {
        // 触发DNS解析的记录
        var dns_resolved = []
        var avg_resolve_time = -1

        if (api_type === APITypes.Stash) {
            dns_resolved = connections.filter(c => c.metadata.tracing.hasOwnProperty("dnsQuery"))

            if (dns_resolved.length > 0) {
                const sum = dns_resolved.reduce((acc, curr) => acc + curr.metadata.tracing.dnsQuery, 0)
                avg_resolve_time = (sum / dns_resolved.length).toFixed(2)
            }
        }
        else {
            dns_resolved = connections.filter(c => (c.metadata.host !== '' && c.metadata.destinationIP !== ''))
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

        return {
            dns_resolve_count: dns_resolved.length,
            avg_resolve_time: {
                value: avg_resolve_time,
                unit: 'ms'
            },
            redundant_dns: this.#convert_connections(redundant_dns),
            abnormal_dns_resolved: this.#convert_connections(abnormal_dns_resolved)
        }
    }

    /**
     * 网络连接类型分析
     * @param {*} connections 
     * @param {*} api_type 
     * @returns 
     */
    #analysis_network(connections, api_type) {
        // 网络类型分类
        const network_tcp = connections.filter(c => (c.metadata.network === 'TCP' || c.metadata.network === 'tcp'))
        const network_udp = connections.filter(c => (c.metadata.network === 'UDP' || c.metadata.network === 'udp'))
        const network_http = connections.filter(c => (c.metadata.network === 'HTTP' || c.metadata.network === 'HTTPS'
            || c.metadata.network === 'http' || c.metadata.network === 'https'))

        // 平均TCP 连接时间分析: TCP+HTTPS
        var avg_tcp_connect_time = -1
        var tcp_connection_count = network_tcp.length + network_http.length;

        if (api_type === APITypes.Stash && (tcp_connection_count > 0)) {
            const sum_tcp = network_tcp.reduce((acc, curr) => acc + curr.metadata.tracing.connect, 0)
            const sum_http = network_http.reduce((acc, curr) => acc + curr.metadata.tracing.connect, 0)

            avg_tcp_connect_time = ((sum_tcp + sum_http) / tcp_connection_count).toFixed(2)
        }

        return {
            tcp_connection_count: tcp_connection_count,
            avg_tcp_connect_time: {
                value: avg_tcp_connect_time,
                unit: 'ms'
            },

            network_tcp: this.#convert_connections(network_tcp),
            network_udp: this.#convert_connections(network_udp),
            network_http: this.#convert_connections(network_http),
        }
    }

    /**
     * 策略分析
     * @param {*} connections 
     * @param {*} api_type 
     * @returns 
     */
    #analysis_policy(connections, api_type) {
        // 平均代理握手时间分析
        const proxied_connections = connections.filter(c => c.chains[0] !== 'DIRECT')
        var avg_proxy_handshake_time = -1

        if (api_type === APITypes.Stash && proxied_connections.length > 0) {
            const sum = proxied_connections.reduce((acc, curr) =>
                acc + (curr.metadata.tracing.hasOwnProperty("handshake") ? curr.metadata.tracing.handshake : 0), 0)
            avg_proxy_handshake_time = (sum / proxied_connections.length).toFixed(2)
        }

        // 拦截的请求
        // 提示：Stash的connections能看到REJECT请求，Clash看不到
        const rejected_requests = connections.filter(c => c.chains[0] === 'REJECT')

        // 未匹配规则的记录
        // 数量越多说明规则越不完善
        const final_matched = connections.filter(c => (c.rule === 'MATCH' || c.rule === 'Match'))

        return {
            proxied_count: proxied_connections.length,
            avg_proxy_handshake_time: {
                value: avg_proxy_handshake_time,
                unit: 'ms'
            },
            reject_count: rejected_requests.length,

            final_matched: this.#convert_connections(final_matched)
        }
    }
}

class ReportGenerator {
    constructor() {

    }

    generate_tile_object(ana_result, settings) {
        const body = {
            title: `${settings.server_name} Insight`,
            content: `↑ ${ana_result.upload_traffic.value} ${ana_result.upload_traffic.unit}   ↓ ${ana_result.download_traffic.value} ${ana_result.download_traffic.unit}
活动连接: ${ana_result.active_connection_count}  UDP: ${ana_result.network.network_udp.length}
冗余DNS: ${ana_result.dns.redundant_dns.length}  异常解析: ${ana_result.dns.abnormal_dns_resolved.length}`,
            icon: "arrow.up.arrow.down.circle.fill"
        }

        return body
    }

    generate_json(ana_result, settings) {
        const json = {
            version: version,
            server_name: settings.server_name,
            api_type: settings.api_type,
            api_addr: settings.api_addr,
            payload: ana_result
        }

        return JSON.stringify(json)
    }

    generate_html(ana_result, settings) {
        var html = `<!DOCTYPE html>
    <html>
    
    <head>
        <title>
        Clash Insight by RS0485
        </title>
    </head>
    
    <body>
        <h1>${settings.server_name} <span style="background-color: #000000; color: #00FF00; padding: 5px 5px;">Insight</span></h1>
        <p>v${version} by <a title="Visit source code on github" href="https://github.com/RS0485/network-rules">RS0485</a> </p>`

        // Summary
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
                    `${ana_result.active_connection_count}`,
                    `${ana_result.dns.dns_resolve_count}`,
                    `${ana_result.dns.avg_resolve_time.value} ${ana_result.dns.avg_resolve_time.unit}`,
                    `${ana_result.network.tcp_connection_count}`,
                    `${ana_result.network.avg_tcp_connect_time.value} ${ana_result.network.avg_tcp_connect_time.unit}`,
                    `${ana_result.policy.proxied_count}`,
                    `${ana_result.policy.avg_proxy_handshake_time.value} ${ana_result.policy.avg_proxy_handshake_time.unit}`])
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
                    `${ana_result.active_connection_count}`,
                    `${ana_result.dns.dns_resolve_count}`])
            }

            html += this.#create_table_node('统计信息', '', '', active_connection_table)
        }

        if (typeof ana_result.recent_requests !== 'undefined') {
            html += this.#create_insight_node(
                '最近请求',
                '以下是最近的10个请求。',
                '',
                ana_result.recent_requests, settings.api_type)
        }

        if (typeof ana_result.dns.redundant_dns !== 'undefined') {
            html += this.#create_insight_node(
                '不必要的DNS解析',
                '以下域名的最终出口为代理，不需要在本地进行DNS解析，<b>列表中的域名浪费了一次DNS解析时间</b>。',
                '当数量较多时可能会导致网速变慢，建议进行优化，例如在规则列表将IP相关的规则放在域名规则后面(或者添加no-resolve避免DNS解析)、将常用域名添加到代理规则等。',
                ana_result.dns.redundant_dns, settings.api_type)
        }

        if (typeof ana_result.dns.abnormal_dns_resolved !== 'undefined') {
            html += this.#create_insight_node(
                '异常的DNS解析时间',
                '以下域名的DNS的解析时间异常(超过120ms)，可能导致首次连接速度较慢。',
                'DNS解析慢也可能是由于网络环境引起的。在网络正常的情况下，如果异常数量较多，建议配置更快的DNS服务器。',
                ana_result.dns.abnormal_dns_resolved, settings.api_type)
        }

        if (typeof ana_result.policy.final_matched !== 'undefined') {
            html += this.#create_insight_node(
                '未命中规则',
                '以下请求未命中任何规则，触发了最终的<b>MATCH</b>。',
                '这种情况一般会触发DNS解析(如果规则列表包含IP相关的规则)，建议将常用的代理域名添加到规则列表以节省DNS解析时间。',
                ana_result.policy.final_matched, settings.api_type)
        }

        {
            var active_connection_table = []

            active_connection_table.push([
                'REJECT',
                'TCP',
                'UDP',
                'HTTP(S)'])

            active_connection_table.push([
                `${ana_result.policy.reject_count}`,
                `${ana_result.network.network_tcp.length}`,
                `${ana_result.network.network_udp.length}`,
                `${ana_result.network.network_http.length}`])

            html += this.#create_table_node('活跃连接', '', '', active_connection_table)
        }

        if (typeof ana_result.network.network_udp !== 'undefined') {
            html += this.#create_insight_node(
                '',
                '活跃UDP连接',
                'UDP连接必须使用真实的IP地址，如果列表中的destination为fake-ip(198.18.x.x)，建议将域名添加到fake-ip-filter白名单，否则无法连接！',
                ana_result.network.network_udp, settings.api_type)
        }

        html += '</body> </html>'

        return html
    }

    #create_table_node(title, description, tips, rows) {
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

        node_content += '<table border="1" cellpadding="5" style="border-collapse:collapse;">'
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

    #create_insight_node(title, description, tips, connections, api_type) {
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
            const upload = record.upload
            const download = record.download

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

        return this.#create_table_node(title, description, tips, insight_table)
    }
}

class ClashInsightApp {
    #runtime
    #settings
    #request_timeout = 3000

    constructor() {

    }

    run() {
        this.#detect_runtime()
        this.#load_settings(this.#runtime)

        this.#process_request(this.#runtime, this.#settings, this.#request_timeout, this.#handle_response)
    }

    #detect_runtime() {
        if (typeof $notify !== 'undefined' && typeof $task !== 'undefined') {
            this.#runtime = Runtimes.QuantumultX
        }
        else if (typeof $environment !== 'undefined' && typeof $environment["stash-version"] !== 'undefined') {
            this.#runtime = Runtimes.Stash
        }
        else if (typeof process !== 'undefined' && typeof module !== 'undefined') {
            this.#runtime = Runtimes.NodeJS
        }
        else {
            throw 'unknown runtime!'
        }
    }

    #load_settings(runtime) {
        this.#settings = new Settings(runtime)
        this.#settings.load()
    }

    #handle_response(data, runtime, settings) {
        const insight = new ConnectionInsight()
        const json_data = insight.analysis(settings.api_type, data)

        const report = new ReportGenerator()

        if (settings.output_format === OutputFormats.Json) {
            $done({
                status: runtime === Runtimes.Stash ? 200 : 'HTTP/1.1 200 OK',
                headers: {
                    'Content-Type': 'application/json',
                    'Served-By': `Clash Insight v${version}`,
                    'Report-To': 'https://github.com/RS0485/network-rules'
                },
                body: report.generate_json(json_data, settings)
            });
        }
        else if (settings.output_format === OutputFormats.Html) {
            $done({
                status: runtime === Runtimes.Stash ? 200 : 'HTTP/1.1 200 OK',
                headers: {
                    'Content-Type': 'text/html;charset=UTF-8',
                    'Served-By': `Clash Insight v${version}`,
                    'Report-To': 'https://github.com/RS0485/network-rules'
                },
                body: report.generate_html(json_data, settings)
            });
        }
        else {
            const tile = report.generate_tile_object(json_data, settings)
            $done(tile);
        }
    }

    #process_request(runtime, settings, request_timeout, response_callback) {
        if (runtime === Runtimes.Stash) {
            $httpClient.get({
                url: settings.api_addr,
                timeout: request_timeout,
                headers: { 'authorization': `Bearer ${settings.api_token}` },
            }, (error, response, data) => {
                if (error) {
                    throw error
                }
                else {
                    response_callback(data, runtime, settings)
                }
            });
        }
        else if (runtime === Runtimes.QuantumultX) {
            $task.fetch({
                url: settings.api_addr,
                timeout: request_timeout,
                headers: { 'authorization': `Bearer ${settings.api_token}` }
            }).then(response => {
                response_callback(response.body, runtime, settings)
            }, reason => {
                throw reason.error
            })
        }
        else {
            var request = require('request')

            request({
                url: settings.api_addr,
                timeout: request_timeout,
                headers: { 'authorization': `Bearer ${settings.api_token}` }
            }, function (err, res, body) {
                if (err) {
                    throw err
                }

                response_callback(body, runtime, settings)
            })
        }
    }
}

// NOTE: tricks for nodejs
if (typeof $done === 'undefined') {
    $done = console.log
}

const clash_insight = new ClashInsightApp()

try {
    clash_insight.run()
}
catch (e) {
    console.log(e)
    $done({});
}

