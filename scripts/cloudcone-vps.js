/*
 * CloudCone VPS 信息面板(Stash 脚本)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.2
 * @note 
 *   1. 使用前需自行部署CloudCone API：https://github.com/RS0485/CloudCone-API
 *   2. 运行参数通过脚本进行设置：$persistentStore.write('{ "email": "rs0485@example.com", "password": "hellopass", "vpsid": "12345", "api_addr": "https://cloudcone-api.example.workers.dev" }', "cloudcone-vps-options"); $done({settings: "ok"})
 * 
 * Change Logs:
 *   - v1.0.1  Store cookie in persistent store to speedup API call
 *   - v1.0.2  Set parameters by http headers instead of query parameters
 * 
 */

var options = {}
const option_store = $persistentStore.read("cloudcone-vps-options")

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
        var cookies = $persistentStore.read('cloudcone-vps-cookies')
        if (typeof cookies === 'undefined') {
            cookies = ''
        }

        const api_call = await request_web(`${options.api_addr}/cc-api/v1.0/get-info`, {
            'referer': 'https://app.cloudcone.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'x-vpsid': `${options.vpsid}`,
            'x-email': `${options.email}`,
            'x-password': `${options.password}`,
            'x-cookie': `${cookies.split(';')[0]}`
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

            $persistentStore.write(new_cookies, 'cloudcone-vps-cookies')
        }

        json = JSON.parse(api_call.data)
        if (!json.result) {
            $done({
                content: `${json.message}`
            })
        }

        if (typeof json.debug_info !== 'undefined' && json.debug_info.re_login) {
            console.log(`Failed to login with user cookies: ${json.debug_info.user_cookies}, re-login success, new cookies is set: ${new_cookies}`)
        }

        var title = `${json.info.name.substring(0, 32).toUpperCase()} ` + ((typeof json.debug_info !== 'undefined' && json.debug_info.re_login) ? '+' : '-') + ` ${json.info.status}`
        var content = `${json.info.description} - ${json.usage.ips.ipv6} IPv6`
        content += `\n${json.info.node} @ ${json.info.dc_location}`
        content += `\n$⇅ {json.usage.bandwidth.used.value} ${json.usage.bandwidth.used.unit} of ${json.usage.bandwidth.total.value} ${json.usage.bandwidth.total.unit}/${json.usage.bandwidth.cycle}`
        content += `\n💵 𝐑𝐄𝐍𝐄𝐖 ${json.info.renew}`

        body = {
            title: title,
            content: content
        }
        $done(body);
    }
    catch (e) {
        $done({
            content: `执行异常: ${e.message}`
        })
    }
})()
