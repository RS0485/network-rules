/*
 * EUGameHost VPS 信息面板(Stash 脚本)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.0
 * @note 
 *   1. 使用前需自行部署CloudCone API：https://github.com/RS0485/CloudCone-API
 *   2. 运行参数通过脚本进行设置：$persistentStore.write('{ "email": "rs0485@example.com", "password": "hellopass", "vpsid": "12345", "api_addr": "https://cloudcone-api.example.workers.dev" }', "eugamehost-vps-options"); $done({settings: "ok"})
 * 
 * Change Logs:
 *   - v1.0.0   init
 * 
 */

var options = {}
const option_store = $persistentStore.read("eugamehost-vps-options")

if (typeof option_store !== 'undefined' && option_store !== '') {
    try {
        options = JSON.parse(option_store)
    }
    catch (e) {
        console.log(`参数格式错误: "${option_store}"`)

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

(async () => {
    try {
        var cookies = $persistentStore.read('eugamehost-vps-cookies')
        if (typeof cookies === 'undefined') {
            cookies = ''
        }

        const api_call = await request_web(`${options.api_addr}/eugh-api/v1.0/get-info`, {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'x-vpsid': `${options.vpsid}`,
            'x-email': `${options.email}`,
            'x-password': `${options.password}`,
            'x-cookie': `${cookies}`
        });

        if (api_call.error || api_call.response.status !== 200) {
            $done({
                content: `API返回错误码 ${api_call.response.status}`
            })
        }

        // Store cookies
        var new_cookies = api_call.response.headers['Set-Cookie']
        if (typeof new_cookies !== 'undefined' && new_cookies !== null && new_cookies !== '') {
            console.log(`New cookies received: ${new_cookies}`)

            $persistentStore.write(new_cookies, 'eugamehost-vps-cookies')
        }

        json = JSON.parse(api_call.data)
        if (!json.result) {
            $done({
                content: `${json.message}`
            })
        }
        if (!json.payload.server.success || !json.payload.state.success) {
            console.log(api_call.data)

            $done({
                content: `server or state API failed`
            })
        }

        if (typeof json.debug_info !== 'undefined' && json.debug_info.re_login) {
            console.log(`Failed to login with user cookies: ${json.debug_info.user_cookies}, re-login success, new cookies is set: ${new_cookies}`)
        }

        const mem_total = format_traffic(json.payload.state.data.state.memory.memtotal * 1000)
        const mem_used = format_traffic((json.payload.state.data.state.memory.memtotal
            - json.payload.state.data.state.memory.memfree
            - json.payload.state.data.state.memory.buffers
            - json.payload.state.data.state.memory.cached
            - json.payload.state.data.state.memory.sreclaimable) * 1000)

        const traffic_dl = format_traffic(json.payload.state.data.state.traffic.total.rx)
        const traffic_up = format_traffic(json.payload.state.data.state.traffic.total.tx)
        const traffic_total =  format_traffic(json.payload.state.data.state.traffic.total.total)
        const traffic_limit = format_traffic(json.payload.server.data.resources.traffic * 1000 * 1000 * 1000)

        var reset_date = Date.parse(json.payload.server.data.traffic.end)
        reset_date = new Date(reset_date).toLocaleString('zh-CN')

        var title = `${json.payload.server.data.name.toUpperCase()} ` + ((typeof json.debug_info !== 'undefined' && json.debug_info.re_login) ? '+' : '-') + ` ${json.payload.state.data.state.state}`
        var content = `${json.payload.server.data.os.name}`
        content += `\n𝐌𝐄𝐌 ${mem_used.value} ${mem_used.unit} of ${mem_total.value} ${mem_total.unit}`
        content += `\n𝐍𝐄𝐓 ↑ ${traffic_up.value} ${traffic_up.unit}  ↓ ${traffic_dl.value} ${traffic_dl.unit} = ⇅ ${traffic_total.value} ${traffic_total.unit} of ${traffic_limit.value} ${traffic_limit.unit}/Mo`
        content += `\n🔄 𝐑𝐄𝐒𝐄𝐓 ${reset_date}`

        body = {
            title: title,
            content: content,
            icon: json.payload.server.data.server_info.icon
        }
        $done(body);
    }
    catch (e) {
        $done({
            content: `执行异常: ${e.message}`
        })
    }
})()
