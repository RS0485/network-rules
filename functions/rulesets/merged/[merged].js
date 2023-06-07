/**
 * @summary Merge Clash rulesets
 * @version 1.0.0
 * 
 * @note Before deploying to Cloudflare Pages, you should bind a Cloudflare KV store with name "NETWORK_RULES",
 *       then add items with keys that corresponds to the URL pathname of the custom rulesets you want to serve. 
 * 
 * @example If you want to serve the merged ruleset at https://www.example.com/rulesets/merged/proxy-cidr.yaml, 
 *          you should add an item with the key "/rulesets/merged/proxy-cidr.yaml" to the KV store, the content should be one URL per line. example:
 *            https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/telegram-cidr.yaml
 *            https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare-cidr-ipv4.yaml
 *            https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/cloudflare-cidr-ipv6.yaml
 *            https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/dns-polluted-ips.yaml
 * 
 */


/**
* Request all URLs and merge the payloads.
* @returns {Response} The merged response.
*/
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);
    const rulesKV = context.env.NETWORK_RULES;

    if (!rulesKV) {
        return new Response(`Not bind to KV NETWORK_RULES`, { status: 500 });
    }

    // Get the value from the KV store
    const resourceKey = url.pathname;
    console.log(`Resource key: ${resourceKey}`);

    let text;
    try {
        text = await rulesKV.get(resourceKey);
    } catch (error) {
        console.error(`Failed to read ${resourceKey} KV: `, error.message);
    }

    if (text) {
        const ruleURLs = text.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .filter(line => !line.startsWith('//'))
            .filter(line => !line.startsWith('#'));

        return mergeRulesets(ruleURLs);
    } else {
        // Return a 404 status code if the resource is not found
        return new Response(`${resourceKey} not found in KV`, { status: 404 });
    }
}

/**
 * This function extracts the text after 'payload' from response body
 * REF: https://developers.cloudflare.com/workers/examples/aggregate-requests/
 * @param {*} response 
 * @returns {string} The payload text.
 */
async function extractPayload(response) {
    const prefix = '# ' + response.url + '\n';

    if (!response.ok) {
        return prefix;
    }

    const content = await response.text();

    const pattern = 'payload:';
    const found = content.indexOf(pattern);

    if (found === -1) {
        return prefix;
    } else {
        // Make all lines the zero indent
        const lines = content.substring(found + pattern.length).split('\n').map(item => item.trim());
        return prefix + lines.join('\n');
    }
}

/**
 * Merge the payloads from a list of rulesets.
 * @param {Array} rulesets The list of ruleset URLs.
 * @returns {Response} The merged response.
 */
async function mergeRulesets(rulesets) {
    const init = {
        headers: {
            Referer: "https://github.com/RS0485",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
        },
    };

    const MAX_REQ_TASK = 5; // Cloudflare functions can have 5 concurrent connections at max
    const results = [];

    for (let i = 0; i < rulesets.length; i += MAX_REQ_TASK) {
        const subRulesets = rulesets.slice(i, i + MAX_REQ_TASK);
        const subResponses = await Promise.all(subRulesets.map(x => fetch(x, init)));
        //const subResults = await Promise.all(subResponses.map(x => extractPayload(x)));
        const subResults = await Promise.all(subResponses.map(async (x) => {
            if (x.status !== 200) {
                throw new Error(`Request to ${x.url} returned status code ${x.status}`);
            }
            return extractPayload(x);
        }));

        results.push(...subResults);
    }

    let content = `# Merged rules for the following ${rulesets.length} subscription URLs:\n`;
    rulesets.forEach(ruleset => {
        content += '# ' + ruleset + '\n';
    });

    content += '\npayload:\n';
    content += results.join('\n');

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'max-age=86400'
        }
    });
}
