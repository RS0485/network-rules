/*
 * Quantumult X IP信息解析脚本
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.1
 * @note 配置方式: 
 *   - 作为节点信息解析器:      geo_location_checker=http://ip-api.com/json/?lang=zh-CN, https://raw.githubusercontent.com/RS0485/network-rules/main/scripts/geolocation-parser.js
 *   - 作为task脚本查询直连IP:  https://raw.githubusercontent.com/RS0485/network-rules/main/scripts/geolocation-parser.js, tag=查询公网IP信息, img-url=network.system, enabled=true
 * 
 */

if (typeof $response === 'undefined') {
    // Require API when called by a task
    const option = {
        url: 'http://ip-api.com/json/?lang=zh-CN',
        opts: {
            policy: 'DIRECT'
        },
        timeout: 3000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        },
    }

    $task.fetch(option).then(response => {
        handle_response(response, true)
    }, reason => {
        console.log(`fetch error: ${reason.error}`)
        $done();
    })
}
else {
    handle_response(response, false)
}

const handle_response = (response, called_by_task) => {
    if (response.statusCode !== 200) {
        $done();
    }
    else {
        const json_data = JSON.parse(response.body)

        const ip = json_data.query
        const country = json_data.country
        const country_code = json_data.countryCode
        const country_emoji = getFlagEmoji(country_code)
        const city = json_data.city
        const region = json_data.regionName
        const isp = json_data.isp
        const timezone = json_data.timezone
        const as = json_data.as

        const title = `${country_emoji} ${city} ${region} ${country}`
        const subtitle = `${isp}`
        const description = `IP: ${ip}\n地址: ${title}\n时区: ${timezone}\nISP: ${isp}\nAS: ${as}`

        if (called_by_task) {
            console.log(description)

            $done({
                'title': '直连IP信息',
                'htmlMessage': `IP: ${ip}<br>地址: ${title}<br>时区: ${timezone}<br>ISP: ${isp}<br>AS: ${as}`
            });
        }
        else {
            $done({ title, subtitle, ip, description });
        }
    }
}

function getFlagEmoji(countryCode) {
    // author @congcong0806
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
