/**
 * @summary Generates Clash rules from hosts file
 * @version 1.0.0
 * 
 * @example https://www.example.com/rulesets/hosts?url=https://raw.githubusercontent.com/Skimige/AntiMakedingHosts/master/hosts
 */


/**
 * @summary Cloudflare handlers
 * @param {Request} context - The Cloudflare Pages request object
 * @returns {Response} - The response object containing the Stash ASN rules or an error message
 */
export async function onRequest(context) {
    const request = context.request;
    const { searchParams } = new URL(request.url);

    let hostsURL = searchParams.get('url');
    if (!hostsURL || hostsURL === '') {
        return new Response(`Invalid hosts URL.`, { status: 404 });
    }

    const response = await fetch(
        hostsURL, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
        },
    });

    if (!response.ok) {
        return new Response(`hosts URL: ${hostsURL}`, { status: response.status });
    }

    const content = await response.text();

    const hosts = [];
    const lines = content.split('\n');
    lines.forEach(line => {
        line = line.trim();

        if (!line.startsWith('#') && line !== '') {
            hosts.push(line.split(' ').pop());
        }
    });

    // Generate the header and payload for clash rules.
    let headerLines = [];
    headerLines.push(`# NAME: Clash rules from hosts`);
    headerLines.push(`# BEHAVIOR: domain`);
    headerLines.push(`# SOURCE: ${hostsURL}`);
    headerLines.push(`# COUNT: ${hosts.length}`);
    headerLines.push(`# GENERATED: ${new Date().toISOString()}`);
    headerLines.push('');
    headerLines.push('payload:');

    const hostsPayload = hosts.map(item => `  - "${item}"`);
    const text = headerLines.concat(hostsPayload).join("\n");

    return new Response(text, {
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'max-age=86400'
        }
    });
}
