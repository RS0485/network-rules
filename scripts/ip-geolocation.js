/*
 * 由@congcong0806编写
 * 原脚本地址：https://github.com/congcong0806/surge-list/blob/master/Script/ipcheck.js
 * 由@Rabbit-Spec修改
 * 更新日期：2022.06.15
 * 版本：1.1
 */

$httpClient.get(
  {
    url: 'http://ip-api.com/json/?lang=zh-CN',
    headers: { referer: ' http://ip-api.com/' },
  },
  (error, response, data) => {
    let jsonData = JSON.parse(data)

    let ip = jsonData.query
    let country = getFlagEmoji(jsonData.countryCode)
    let city = jsonData.city
    let region = jsonData.regionName
    let isp = jsonData.isp

    body = {
      title: 'IP地址信息',
      content: `IP地址: ${ip}\n所在地: ${country}${region} - ${city}\n运营商: ${isp}`,
      icon: 'globe.asia.australia.fill',
      backgroundColor: '#0C9DFA',
    }

    $done(body);
});


function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
