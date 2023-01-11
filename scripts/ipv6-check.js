/*
 * IPv6 连接测试(Quantumult X 脚本)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.0
 * @note 配置方法:
 *    [task_local]
 *    event-interaction https://raw.githubusercontent.com/RS0485/network-rules/main/scripts/ipv6-check.js, tag=IPv6可用性测试, img-url=6.circle.fill.system, enabled=true
 */

const option = {
	url: 'https://www.cloudflare.com/cdn-cgi/trace',
	opts: {
		policy: $environment.params
	},
	timeout: 3000,
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
	},
}

$task.fetch(option).then(response => {
	if (response.statusCode !== 200) {
		console.log(`error response code: ${response.statusCode}`)
		$done();
	}
	else {
		const match = response.body.match(/ip=(.*)\n/);
		if (!match || match.length < 1) {
			console.log(`ip address not found: ${response.body}`)
			$done();
		}

		const ip = match[1]
		const support_v6 = ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(\/\d+)?$/) ? '不支持' : '支持'
		console.log(`ip address=${ip}, support_v6=${support_v6}`)

		$done({
			'title': 'IPv6可用性测试',
			'htmlMessage': `IP: ${ip}<br>该服务器<b>${support_v6}</b>IPv6`
		});
	}
}, reason => {
	console.log(`fetch error: ${reason.error}`)
	$done();
})
