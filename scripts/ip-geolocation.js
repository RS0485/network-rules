/*
 * 同时查询本地和代理的IP信息(Stash 脚本)
 * 
 * author: RS0485
 * repo: https://github.com/RS0485/network-rules
 * note: 使用前配置域名ip-api.com使用直连，域名api.ip.sb使用代理
 * 
 */

$httpClient.get(
  {
      url: 'http://ip-api.com/json/?lang=zh-CN',
      headers: { referer: ' http://ip-api.com/' },
  }, (error, response, data) => {
      var geo_direct = ''

      if (error) {
          geo_direct = error
      }
      else {
          const json_data = JSON.parse(data)

          const ip = json_data.query
          const country_code = json_data.countryCode
          const country = getFlagEmoji(country_code)
          const city = json_data.city
          const region = json_data.regionName
          const isp = json_data.isp

          geo_proxy = `本地IP: ${ip}\n${country}${country_code}, ${region}, ${city}, ${isp.substring(0, 32)}`
      }

      $httpClient.get({
          url: 'https://api.ip.sb/geoip',
          headers: { "user-agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' },
      }, (error, response, data) => {
          var geo_proxy = ''

          if (error) {
              geo_proxy = error
          }
          else {
              const json_data = JSON.parse(data)

              const ip = json_data.ip
              const country_code = json_data.country_code
              const country = getFlagEmoji(country_code)
              const city = json_data.city
              const region = json_data.region
              const isp = json_data.isp

              geo_proxy = `代理IP: ${ip}\n${country}${country_code}, ${region}, ${city}, ${isp.substring(0, 32)}`
          }

          body = {
              title: "𝐈𝐏 𝐆𝐄𝐎𝐋𝐎𝐂𝐀𝐓𝐈𝐎𝐍",
              content: `${geo_direct}\n${geo_proxy}`,
              icon: "network"
          }
          $done(body);
      });
  });

function getFlagEmoji(countryCode) {
  // author @congcong0806
  const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}