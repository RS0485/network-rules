/**
 * @summary Convert the format of ruleset
 * @version 1.0.0
 * 
 * @example https://www.example.com/rulesets/conv?src=clash&dst=surge&url=https://example.com/clashrule.yaml
 */


/**
 * @summary Cloudflare handlers
 * @param {Request} context - The Cloudflare Pages request object
 * @returns {Response} - The response object containing the Stash ASN rules or an error message
 */
export async function onRequest(context) {
    const request = context.request;
    const { searchParams } = new URL(request.url);

    let src = searchParams.get('src');
    let dst = searchParams.get('dst');
    let url = searchParams.get('url');

    // let type = searchParams.get('type');
    // let subtype = searchParams.get('subtype');
    // let policy = searchParams.get('policy');

    if (!src || src == '' || !dst || dst == '' || !url || url === '') {
        return new Response(`Invalid parameters src=${src}, dst=${dst}, ruleURL=${url}.`, { status: 404 });
    }

    const response = await fetch(
        url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
        },
    });

    if (!response.ok) {
        return new Response(`URL: ${url}`, { status: response.status });
    }

    const content = await response.text();

    const lines = content.split('\n');

    var dst_lines = [];
    for (const ln of lines) {
        var line = ln.trim();
        if (!line.startsWith('-')) {
            // Ignore comments or empty lines
            continue;
        }

        // Expected formats:
        //   - "+.100beatscheap.com"
        //   - "store.storeimages.apple.com.akadns.net"`
        const sections = line.split(/\"|\+\./);
        if (sections.length < 3 || sections.length > 4) {
            notify(`invalid line with content ${line}`);

            return {
                result: false,
                payload: []
            };
        }

        if (sections.length === 3) {
            dst_lines.push(`${sections[1]}`);
        }
        else {
            dst_lines.push(`.${sections[2]}`);
        }
    }

    const text = dst_lines.join("\n");

    return new Response(text, {
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'max-age=86400'
        }
    });
}
