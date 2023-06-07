/**
 * @summary Serve custom rulesets from Cloudflare KV
 * @version 1.1.0
 * 
 * @note Before deploying to Cloudflare Pages, you should bind a Cloudflare KV store with name "NETWORK_RULES",
 *       then add items with keys that corresponds to the URL pathname of the custom rulesets you want to serve. 
 * 
 * @example If you want to serve the custom ruleset at https://www.example.com/rulesets/custom/direct.yaml, 
 *          you should add an item with the key "/rulesets/custom/direct.yaml" to the KV store.
 */

/**
* Read value from KV by using pathname of URL as key
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
