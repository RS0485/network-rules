/**
 * @summary Filter rules by prefixes and keywords
 * @version 1.0.0
 * 
 * @description This script filters duplicate items which is handled by "script shortcuts" to keep rulesets small and improve performance.
 * 
 * @example Use this script shortcut before rulesets to filter ads:
 *              S-BLOCK-ADS: host.startswith(('ads.', 'ad.', 'log.')) or "analytics" in host
 *          Afterwards, you can remove items from this ruleset:
 *              https://www.example.com/rulesets/filter?url=https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/category-ads-all.yaml&prefixes=%2B.ads.,%2B.ad.&keywords=analytics
 */

/**
 * @summary Cloudflare handlers
 * @param {Request} context - The Cloudflare Pages request object
 * @returns {Response} - The response object containing the Stash ASN rules or an error message
 */
export async function onRequest(context) {
    const request = context.request;
    const { searchParams } = new URL(request.url);

    let prefixesStr = searchParams.get('prefixes') || '';
    let suffixesStr = searchParams.get('suffixes') || '';
    let keywordsStr = searchParams.get('keywords') || '';

    const prefixesOrig = prefixesStr.split(',').map(item => item.trim()).filter(item => item !== '');
    const prefixesMod = prefixesOrig.map(item => item.startsWith("+.") ? item : "+." + item);
    const prefixes = [...new Set(prefixesOrig.concat(prefixesMod))];

    const suffixes = suffixesStr.split(',').map(item => item.trim()).filter(item => item !== '');
    const keywords = keywordsStr.split(',').map(item => item.trim()).filter(item => item !== '');
    console.log(`prefixes: ${prefixes}, suffixes: ${suffixes}, keywords:${keywords}`);

    let upstreamURL = searchParams.get('url');
    if (!upstreamURL || upstreamURL === '') {
        return new Response(`Invalid ruleset URL.`, { status: 404 });
    }

    const response = await fetch(
        upstreamURL, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
        },
    });

    if (!response.ok) {
        return new Response(`ruleset URL: ${upstreamURL}`, { status: response.status });
    }

    const content = await response.text();

    const lines = content.split('\n');
    const newLines = lines.filter(str => {
        const sections = str.split('"');
        const domain = sections.length > 1 ? sections[1] : sections[0];

        const hasPrefix = prefixes.some(prefix => domain.startsWith(prefix));
        const hasSuffix = suffixes.some(suffix => domain.endsWith(suffix));
        const hasKeyword = keywords.some(keyword => domain.includes(keyword));
        return !(hasPrefix || hasSuffix || hasKeyword);
    });

    return new Response(newLines.join('\n'), {
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'max-age=86400'
        }
    });
}
