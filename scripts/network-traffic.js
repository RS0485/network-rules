/*
 * Stash网络流量统计分析
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.2
 * 
 */

$httpClient.get(
    {
        url: 'http://localhost:9090/connections',
    }, (error, response, data) => {
        if (error) {
            done({});
        }
        else {
            const json_data = JSON.parse(data)

            const active_connections = json_data.connections.length
            const upload_traffic = format_traffic(json_data.uploadTotal)
            const download_traffic = format_traffic(json_data.downloadTotal)

            // 当最终出站策略不为'DIRECT'时，最优的策略就是没有DNS解析时间，所以这个DNS解析是多余的
            // 此计数越低越好，当数值比较高时建议对规则进行优化
            const redundant_dns = json_data.connections.filter(c => c.chains[0] !== 'DIRECT' && c.metadata.tracing.hasOwnProperty("dnsQuery"))

            body = {
                title: "网络流量统计",
                content: `↑ ${upload_traffic.value} ${upload_traffic.unit}   ↓ ${download_traffic.value} ${download_traffic.unit}\n活动连接: ${active_connections}   冗余DNS: ${redundant_dns.length}`,
                icon: "arrow.up.arrow.down.circle.fill"
            }

            $done(body);
        }
    });


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