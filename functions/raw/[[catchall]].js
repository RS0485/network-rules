/**
 * @summary Serve any text content from Cloudflare KV
 * @version 1.0.0
 * 
 * @note 1. You need a authorization token to access this page, the token is defined as a Cloudflare env variable "RAW_AUTH_TOKEN"
 *       2. Before deploying to Cloudflare Pages, you should bind a Cloudflare KV store with name "NETWORK_RULES",
 *          then add items with keys that corresponds to the URL pathname of the custom rulesets you want to serve. 
 * 
 * @example If you want to serve the custom override text at https://www.example.com/raw/rewrite/blockads.stoverride, 
 *          you should add an item with the key "/raw/rewrite/blockads.stoverride" to the KV store.
 */

/**
* Read value from KV by using pathname of URL as key
* @returns {Response} The merged response.
*/
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);
    const rulesKV = context.env.NETWORK_RULES;
    const authToken = context.env.RAW_AUTH_TOKEN;

    // Check Auth with token
    const authHeader = request.headers.get('Authorization');
    let userToken = '';
    try {
        userToken = authHeader ? atob(authHeader.split(' ').pop()) : '';
    } catch (e) {
        console.error('Error decoding user token:', e);
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')
        || userToken !== authToken || userToken.length < 8) {
        return new Response('Unauthorized', { status: 401 });
    }

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
        return new Response(text, {
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
                'Cache-Control': 'max-age=86400'
            }
        });
    } else {
        // Return a 404 status code if the resource is not found
        return new Response(`${resourceKey} not found in KV`, { status: 404 });
    }
}
