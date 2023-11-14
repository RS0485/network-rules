/**
 * @summary Proxies files from GitHub.
 * @description This function is intended to be used as a Cloudflare worker to proxy files from GitHub, such as rulesets or other files.
 * @version 1.0.0
 * 
 * @example https://www.example.com/gh/RS0485/V2rayDomains2Clash/generated/openai.yaml
 */


/**
 * Proxies a request to GitHub and modify the text content
 * @param {FetchEvent} context - The event object representing the incoming request.
 * @returns {Promise<Response>} - A Promise that resolves to the proxied response from GitHub.
 */
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);
    const { searchParams } = new URL(request.url);

    url.hostname = "raw.githubusercontent.com";
    url.pathname = url.pathname.split("/gh")[1];

    console.log(`Request asset from github ${url}`);
    const response = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
        }
    });

    if (!response.ok) {
        return new Response(`Error response from URL: ${url}`, { status: response.status });
    }

    if (!response.headers.get('content-type').includes('text/plain')) {
        const contentBuffer = await response.arrayBuffer();
        return new Response(contentBuffer, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'max-age=86400'
            }
        });
    }

    let content = await response.text();

    // Modify original text content
    searchParams.forEach((value, key) => {
        const originalTxt = decodeURIComponent(key);
        const replaceTxt = decodeURIComponent(value);

        console.log(`Original: ${originalTxt}, Replace: ${replaceTxt}`);
        content = content.replaceAll(originalTxt, replaceTxt);
    });

    return new Response(content, {
        status: response.status,
        statusText: response.statusText,
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'max-age=86400'
        }
    });
}
