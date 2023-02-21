/*
 * CloudCone/EUGameHost VPS 信息面板(Stash 脚本)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.3
 * @note 
 *   1. 使用前需自行部署CloudCone API：https://github.com/RS0485/CloudCone-API
 *   2. 运行参数通过脚本进行设置：$persistentStore.write('{ "email": "rs0485@example.com", "password": "hellopass", "vpsid": "12345", "api_addr": "https://cloudcone-api.example.workers.dev" }', "cloudcone-vps-options"); $done({settings: "ok"})
 * 
 * Change Logs:
 *   - v1.0.1  Store cookie in persistent store to speedup API call
 *   - v1.0.2  Set parameters by http headers instead of query parameters
 *   - v1.0.3  Support both CloudCone and EuGameHost, specify VPS type via tile arguments
 * 
 */

const VPSTypes = {
    CloudCone: "cloudcone",
    EUGameHost: "eugamehost"
}

// Script parameters
var params = {
    update_rate_limit: 10,
}
params.vps_type = ($argument === 'cloudcone' ? VPSTypes.CloudCone : VPSTypes.EUGameHost)
params.options_name = `${params.vps_type}-vps-options`
params.context_name = `${params.vps_type}-vps-context`

// Options from persistent storage
var options = {}
const option_store = $persistentStore.read(params.options_name)
if (typeof option_store !== 'undefined' && option_store !== '') {
    try {
        options = JSON.parse(option_store)

        if (params.vps_type === VPSTypes.CloudCone) {
            options.api_addr = `${options.api_addr}/cc-api/v1.0/get-info`
        }
        else {
            options.api_addr = `${options.api_addr}/eugh-api/v1.0/get-info`
        }
    }
    catch (e) {
        console.log(`${params.vps_type} 参数格式错误: "${option_store}"`)

        $done({
            content: `参数格式错误, 请重新设置`
        })
    }
}
else {
    $done({
        content: `运行参数未设置`
    })
}

async function request_web(url, headers) {
    const { error, response, data } = await new Promise((resolve, reject) => {
        $httpClient.get({
            url: url,
            headers: headers,
        }, (error, response, data) => {
            if (error) {
                // reject(error);
                resolve({ error, response, data });
            } else {
                resolve({ error, response, data });
            }
        });
    });

    return { error, response, data }
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
        value: parseFloat(friendly_traffic.toFixed(2)),
        unit: friendly_unit
    }
}

(async () => {
    try {
        var context = $persistentStore.read(params.context_name)
        if (typeof context === 'undefined') {
            context = {
                update_time: 0,
                cookies: ''
            }
        }
        else {
            context = JSON.parse(context)
        }

        const time_diff = Date.now() - context.update_time
        if (time_diff < params.update_rate_limit * 1000) {
            console.log(`${params.vps_type} update rate limit, ${time_diff} ms from last update time, tile is not updated.`)
            $done({})
        }

        const api_call = await request_web(`${options.api_addr}`, {
            'referer': `${options.api_addr}`,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'x-vpsid': `${options.vpsid}`,
            'x-email': `${options.email}`,
            'x-password': `${options.password}`,
            'x-cookie': `${context.cookies}`
        })

        if (api_call.error || api_call.response.status !== 200) {
            $done({
                content: `API返回错误码 ${api_call.response.status}`
            })
        }

        json = JSON.parse(api_call.data)
        if (!json.result) {
            $done({
                content: `${json.message}`
            })
        }

        // Store cookie if set throuth http headers
        {
            var new_cookies = api_call.response.headers['set-cookie']

            if (typeof new_cookies !== 'undefined' && new_cookies !== '') {
                console.log(`${params.vps_type} re-login=${json.debug_info && json.debug_info.re_login}, new cookies: ${new_cookies}`)
                context.cookies = new_cookies
            }
        }

        context.update_time = Date.now()
        $persistentStore.write(JSON.stringify(context), params.context_name)

        if (params.vps_type === VPSTypes.CloudCone) {
            var title = `${json.info.name.substring(0, 32).toUpperCase()} ` + ((typeof json.debug_info !== 'undefined' && json.debug_info.re_login) ? '+' : '-') + ` ${json.info.status}`
            var content = `${json.info.description} - ${json.usage.ips.ipv6} IPv6`
            content += `\n${json.info.node} @ ${json.info.dc_location}`
            content += `\n⇅ ${json.usage.bandwidth.used.value} ${json.usage.bandwidth.used.unit} of ${json.usage.bandwidth.total.value} ${json.usage.bandwidth.total.unit}/${json.usage.bandwidth.cycle}`
            content += `\n💵 𝐑𝐄𝐍𝐄𝐖 ${json.info.renew}`

            const body = {
                title: title,
                content: content,
                icon: 'https://app.cloudcone.com/assets/img/logo.png'
            }

            $done(body)
        }
        else {
            const mem_total = format_traffic(json.payload.state.data.state.memory.memtotal * 1000)
            const mem_used = format_traffic((json.payload.state.data.state.memory.memtotal
                - json.payload.state.data.state.memory.memfree
                - json.payload.state.data.state.memory.buffers
                - json.payload.state.data.state.memory.cached
                - json.payload.state.data.state.memory.sreclaimable) * 1000)

            const traffic_dl = format_traffic(json.payload.state.data.state.traffic.total.rx)
            const traffic_up = format_traffic(json.payload.state.data.state.traffic.total.tx)
            const traffic_total = format_traffic(json.payload.state.data.state.traffic.total.total)
            const traffic_limit = format_traffic(json.payload.server.data.resources.traffic * 1000 * 1000 * 1000)

            var reset_date = Date.parse(json.payload.server.data.traffic.end)
            reset_date = new Date(reset_date).toLocaleString('zh-CN')

            var title = `${json.payload.server.data.name.toUpperCase()} ` + ((typeof json.debug_info !== 'undefined' && json.debug_info.re_login) ? '+' : '-') + ` ${json.payload.state.data.state.state}`
            var content = `${json.payload.server.data.os.name}`
            content += `\n𝐌𝐄𝐌 ${mem_used.value} ${mem_used.unit} of ${mem_total.value} ${mem_total.unit}`
            content += `\n𝐍𝐄𝐓 ↑ ${traffic_up.value} ${traffic_up.unit}  ↓ ${traffic_dl.value} ${traffic_dl.unit} = ⇅ ${traffic_total.value} ${traffic_total.unit} of ${traffic_limit.value} ${traffic_limit.unit}/Mo`
            content += `\n🔄 𝐑𝐄𝐒𝐄𝐓 ${reset_date}`

            const body = {
                title: title,
                content: content,
                icon: json.payload.server.data.server_info.icon
            }

            $done(body)
        }
    }
    catch (e) {
        $done({
            content: `执行异常: ${e.message}`
        })
    }
})()
