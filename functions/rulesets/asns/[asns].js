/**
 * @summary Generates Stash ASN rules for a given country or region
 * @version 1.0.0
 * 
 * @example https://www.example.com/rulesets/asns/HK?policy=PROXY
 */


/**
 * @summary Cloudflare handlers
 * @param {Request} context - The Cloudflare Pages request object
 * @returns {Response} - The response object containing the Stash ASN rules or an error message
 */
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);
    const { searchParams } = new URL(request.url);

    let policy = searchParams.get('policy') || 'DIRECT';
    const countryOrRegion = url.pathname.split("/").pop();

    // Fetch the list of ASNs from bgp.he.net.
    const response = await fetch(
        `https://bgp.he.net/country/${countryOrRegion}`, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
        },
    });

    if (!response.ok) {
        return new Response(`policy: ${policy}, countryOrRegion: ${countryOrRegion}, error: ${response.statusText}`, { status: response.status });
    }

    const content = await response.text();
    const asnList = parseASNs(content, policy);

    // Generate the header and payload for the Stash ASN rules.
    let headerLines = [];
    headerLines.push(`name: Stash ASN rules for ${countryOrRegion}`);
    headerLines.push(`desc: policy=${policy}, countryOrRegion=${countryOrRegion}, count=${asnList.payload.length}`);
    headerLines.push(`# author: @RS0485`);
    headerLines.push(`# generated on: ${new Date().toISOString()}`);
    headerLines.push('');
    headerLines.push('payload:');

    if (asnList.result) {
        const asnPayloads = asnList.payload.map(item => `  - "IP-ASN,${item},${policy},no-resolve"`);
        const text = headerLines.concat(asnPayloads).join("\n");

        return new Response(text, {
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
                'Cache-Control': 'max-age=86400'
            }
        });
    } else {
        // Return an error response if the ASN list couldn't be parsed.
        return new Response(`Failed to parse ASN list for countryOrRegion: ${countryOrRegion}`, { status: 500 });
    }
}

/**
 * @summary This function extracts the list of ASNs from the HTML content of bgp.he.net.
 * @param {string} content - The HTML content of the bgp.he.net page.
 * @param {string} policy - The policy to be applied to the generated Stash ASN rules.
 * @returns {object} - An object containing the list of ASNs and a boolean indicating whether the parsing was successful.
 */
function parseASNs(content) {
    // Regex pattern to match the ASN column and capture the ASN number.
    // Exclude rows where the title attribute is not present or empty.
    const regex = /<td><a href="\/AS\d+" title="AS\d+ - .+">AS(\d+)<\/a><\/td>/gm;

    let asnItems = [];
    let m = null;

    while ((m = regex.exec(content)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        asnItems.push(m[1]);
    }

    const result = asnItems.length > 0;

    // Return the list of ASNs and a boolean indicating whether parsing was successful.
    return { payload: asnItems, result };
}
