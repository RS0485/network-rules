/*
 * Quantumult X IP信息解析脚本
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.0
 * @note 配置方式: geo_location_checker=http://ip-api.com/json/?lang=zh-CN, https://raw.githubusercontent.com/RS0485/network-rules/main/resource/geolocation-parser.js
 * 
 */

function getFlagEmoji(countryCode) {
    // author @congcong0806
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

if ($response.statusCode !== 200) {
    $done({});
}
else {
    const json_data = JSON.parse($response.body)

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

    $done({ title, subtitle, ip, description });
}