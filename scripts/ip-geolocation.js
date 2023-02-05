/*
 * 同时查询本地和代理的IP信息(Stash 脚本)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.3
 * @note 使用前请配置分流规则->域名wtfismyip.com使用直连，域名ipgeolocation.io使用代理
 * 
 * Change Logs:
 *   - v1.0.3 支持设置仅显示直连、仅显示代理或显示全部
 *            在脚本编辑器执行代码进行设置: $persistentStore.write('{ "display": "all/direct/proxy" }', "ip-geolication-options"); $done({settings: "ok"})
 * 
 */

// 选项
// display: 显示内容 all-直连和代理 direct-仅显示直连 proxy-仅显示代理
var options = { display: 'all' }

const option_store = $persistentStore.read("ip-geolication-options")
if (typeof option_store !== 'undefined' && option_store !== '') {
    try {
        options = JSON.parse(option_store)
    }
    catch (e) {
        console.log(`解析用户设置"${option_store}"失败，使用默认设置.`)
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

function parse_wftismyip(data) {
    const json_data = JSON.parse(data)

    var ip = json_data.YourFuckingIPAddress
    var country_code = json_data.YourFuckingCountryCode
    var country = getFlagEmoji(country_code)
    var loc = json_data.YourFuckingLocation
    var isp = json_data.YourFuckingISP

    if (ip.length > 16) {
        ip = ip.substring(0, 16) + '...'
    }

    if (isp.length > 32) {
        isp = isp.substring(0, 32) + '...'
    }

    return {
        ip: ip,
        country: country,
        loc: loc,
        isp: isp
    }
}

function parse_ipgeolocation(data) {
    const json_data = JSON.parse(data)

    var ip = json_data.ip
    var country_code = json_data.country_code2
    var country = getFlagEmoji(country_code)
    var city = json_data.city
    var region = json_data.state_prov
    var isp = json_data.isp

    if (ip.length > 16) {
        ip = ip.substring(0, 16) + '...'
    }

    if (isp.length > 32) {
        isp = isp.substring(0, 32) + '...'
    }

    return {
        ip: ip,
        country: country,
        loc: `${region}, ${city}`,
        isp: isp
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
    var geoinfo_direct;
    var geoinfo_proxy;

    if (options.display === 'all' || options.display === 'direct') {
        const direct_response = await request_web('https://wtfismyip.com/json', { 'referer': 'https://wtfismyip.com/' });
        if (direct_response.error) {
            geoinfo_direct = (`直连查询失败: ${direct_response.error}`.substring(0.32))
        }
        else {
            const obj = parse_wftismyip(direct_response.data);
            geoinfo_direct = `直连IP: ${obj.ip} ${obj.country}\n${obj.loc}, ${obj.isp}`
        }
    }

    if (options.display === 'all' || options.display === 'proxy') {
        const proxy_response = await request_web('https://api.ipgeolocation.io/ipgeo?lang=cn', {
            'referer': 'https://ipgeolocation.io/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        });
        if (proxy_response.error) {
            geoinfo_proxy = (`代理查询失败: ${proxy_response.error}`.substring(0.32))
        }
        else {
            const obj = parse_ipgeolocation(proxy_response.data);
            geoinfo_proxy = `代理IP: ${obj.ip} ${obj.country}\n${obj.loc}, ${obj.isp}`
        }
    }

    var geoinfo = ''
    if (geoinfo_proxy && geoinfo_direct) {
        geoinfo = `${geoinfo_direct}\n${geoinfo_proxy}`
    }
    else if (geoinfo_direct) {
        geoinfo = geoinfo_direct
    }
    else if (geoinfo_proxy) {
        geoinfo = geoinfo_proxy
    }
    else {
        geoinfo = `获取IP地址信息失败, display=${options.display}`
    }

    body = {
        title: "𝐈𝐏 𝐆𝐄𝐎𝐋𝐎𝐂𝐀𝐓𝐈𝐎𝐍",
        content: geoinfo,
        icon: "network"
    }
    $done(body);
})()

