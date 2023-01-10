/*
 * 汽油价格查询解析(Stash脚本)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.0
 * 
 */

// 指定查询地区
const region = 'guangdong'

const query_addr = `http://m.qiyoujiage.com/${region}.shtml`

$httpClient.get(
	{
		url: query_addr,
		headers: {
			'referer': 'http://m.qiyoujiage.com/',
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
		},
	}, (error, response, data) => {
		if (error) {
			console.log(`解析油价信息失败, 请反馈至 @RS0485: URL=${query_addr}`)
			done({});
		}
		else {
			const regex = /<dl>[\s\S]+?<dt>(.*油)<\/dt>[\s\S]+?<dd>(.*)\(元\)<\/dd>/gm

			var prices = []
			var m = null;

			while ((m = regex.exec(data)) !== null) {
				// This is necessary to avoid infinite loops with zero-width matches
				if (m.index === regex.lastIndex) {
					regex.lastIndex++;
				}

				prices.push({
					name: m[1],
					value: `${m[2]} 元/L`
				})
			}

			if (prices.length != 4) {
				console.log(`解析油价信息失败, 数量=${prices.length}, 请反馈至 @RS0485: URL=${query_addr}`)
				done({})
			}
			else {
				body = {
					title: "实时油价信息",
					content: `${prices[0].name}  ${prices[0].value}\n${prices[1].name}  ${prices[1].value}\n${prices[2].name}  ${prices[2].value}\n${prices[3].name}  ${prices[3].value}`,
					icon: "fuelpump.fill"
				}

				$done(body);
			}
		}
	});
