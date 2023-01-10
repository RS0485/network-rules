/*
 * 同时查询本地和代理的IP信息(Stash 脚本)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.1
 * @note 使用前请配置分流规则->域名ip-api.com使用直连，域名ipgeolocation.io使用代理
 * 
 */

$httpClient.get(
	{
		url: 'http://ip-api.com/json/?lang=zh-CN',
		headers: { 'referer': 'http://ip-api.com/' },
	}, (error, response, data) => {
		var geo_direct = ''

		if (error) {
			geo_direct = error
		}
		else {
			const json_data = JSON.parse(data)

			var ip = json_data.query
			var country_code = json_data.countryCode
			var country = getFlagEmoji(country_code)
			var city = json_data.city
			var region = json_data.regionName
			var isp = json_data.isp

			if (ip.length > 16) {
				ip = ip.substring(0, 16) + '...'
			}

			if (isp.length > 32) {
				isp = isp.substring(0, 32) + '...'
			}

			geo_direct = `直连IP: ${ip} ${country}\n${region}, ${city}, ${isp}`
		}

		$httpClient.get(
			{
				url: 'https://api.ipgeolocation.io/ipgeo?lang=cn',
				headers: {
					'referer': 'https://ipgeolocation.io/',
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
				},
			}, (error, response, data) => {
				var geo_proxy = ''

				if (error) {
					geo_proxy = error
				}
				else {
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

					geo_proxy = `代理IP: ${ip} ${country}\n${region}, ${city}, ${isp}`
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