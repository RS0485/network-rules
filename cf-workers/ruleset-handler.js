/*
 * Cloudflare Workers: Clash 订阅规则预处理脚本(规则合并、github反代、规则清单网页)
 * 
 * @author RS0485
 * @repo https://github.com/RS0485/network-rules
 * @version 1.0.1
 *
 * 主要功能:
 *  1. 将多个订阅的规则内容合并成一份，以便生成更少的搜索树、提升加载和规则匹配效率
 *  2. 反代 raw.githubusercontent.com 以便国内直接访问
 *  3. 将 https://github.com/RS0485/V2rayDomains2Clash/tree/generated 的分流规则清单生成网页方便搜索
 * 
 */

const block_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/category-ads-all.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/category-porn.yaml'
]

const proxy_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/yandex.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/microsoft.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/oracle.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/google.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/telegram.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/twitter.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/spotify.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/github.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/gitbook.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/atlassian.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/sourceforge.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/notion.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/rarbg.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/python.yaml'
]

const proxy_cidr_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/telegram-cidr.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare-cidr-ipv4.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare-cidr-ipv6.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/dns-polluted-ips.yaml'
]

const direct_rulesets = [
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/baidu.yaml',
    'https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/zhihu.yaml'
]

/**
 * This function extracts the text after 'payload' from response body
 * REF: https://developers.cloudflare.com/workers/examples/aggregate-requests/
 * @param {*} response 
 * @returns 
 */
async function extractPayload(response) {
    const prefix = '# ' + response.url + '\n'

    if (!response.ok) {
        return prefix
    }

    const content = await response.text()

    const pattern = 'payload:'
    const found = content.indexOf(pattern)

    if (found === -1) {
        return prefix
    }
    else {
        return prefix + content.substring(found + pattern.length)
    }
}

/**
 * Request all urls and merge the payloads
 * @returns merged response text
 */
async function mergeRulesets(rulesets) {
    const init = {
        headers: {
            'content-type': 'text/plain; charset=utf-8',
            'served-by': 'CF Workers'
        },
    };

    var results = []

    // CF Workers的production版本限制并发请求数量，此处将请求拆分然后合并结果
    const MAX_REQ_TASK = 5
    for (var i = 0; i < rulesets.length; i = i) {
        const sub_rulesets = rulesets.slice(i, i + MAX_REQ_TASK)
        const sub_responses = await Promise.all(sub_rulesets.map(x => fetch(x, init)))
        const sub_results = await Promise.all(sub_responses.map(x => extractPayload(x)))

        results = results.concat(sub_results)

        i += MAX_REQ_TASK
    }

    var content = '# Combined rules for the following subscription URLs:\n'
    rulesets.forEach(ruleset => {
        content += '# ' + ruleset + '\n'
    });

    content += '\npayload:\n'
    content += results.join('\n')

    return new Response(content, init);
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
        value: friendly_traffic.toFixed(2),
        unit: friendly_unit
    }
}

/**
 * Generate a webpage from github file list
 * @returns 
 */
async function generateRuleList(hostname) {
    const init = {
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'served-by': 'CF Workers'
        },
    };

    const response = await fetch('https://api.github.com/repos/RS0485/V2rayDomains2Clash/git/trees/generated?recursive=1', {
        headers: {
            'Referer': 'https://github.com/RS0485',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw 'eror response'
    }

    const content = await response.text()
    const rulesets = JSON.parse(content)

    var html = `<!DOCTYPE html>
<html>

<head>
    <title>
    Clash Rulesets by RS0485
    </title>
</head>

<body>`

    rulesets.tree.forEach(ruleset => {
        const size = format_traffic(ruleset.size)
        html += `<a title="${ruleset.path}" href="https://${hostname}/gh/RS0485/V2rayDomains2Clash/generated/${ruleset.path}">${ruleset.path}</a> &emsp;${size.value} ${size.unit}<br>`
    })

    html += '</body> </html>'

    return new Response(html, init);
}

addEventListener('fetch', event => {
    let request_url = new URL(event.request.url);

    if (request_url.pathname.startsWith('/merged-direct.yaml')) {
        return event.respondWith(mergeRulesets(direct_rulesets));
    }
    else if (request_url.pathname.startsWith('/merged-block.yaml')) {
        return event.respondWith(mergeRulesets(block_rulesets));
    }
    else if (request_url.pathname.startsWith('/merged-proxy.yaml')) {
        return event.respondWith(mergeRulesets(proxy_rulesets));
    }
    else if (request_url.pathname.startsWith('/merged-proxy-cidr.yaml')) {
        return event.respondWith(mergeRulesets(proxy_cidr_rulesets));
    }
    else if (request_url.pathname.startsWith('/gh/')) {
        // Reverse proxy for githubusercontent
        request_url.hostname = "raw.githubusercontent.com";
        request_url.pathname = request_url.pathname.substring(4)

        let request = new Request(request_url, event.request);
        return event.respondWith(
            fetch(request, {
                headers: {
                    'Referer': 'https://github.com/RS0485',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
                }
            })
        );
    }
    else {
        return event.respondWith(generateRuleList(request_url.hostname));
    }
});
