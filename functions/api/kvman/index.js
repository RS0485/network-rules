/**
 * @summary KV management API
 * @description Provide API to export, import, list, get, delete, add, modify KV items
 * @version 1.0.0
 * 
 * @example POST https://www.example.com/api/kvman?action={action}
 *          action        json body                                    response
 *          export        none                                         {"success": true, "message": "OK/error message", "payload": [{"key": "key name", "value": "text value"},...]}
 *          list          none                                         {"success": true, "message": "OK/error message", "payload": [kv names]}
 *          import        {the payload of export API returns}          {"success": true, "message": "OK/error message", "payload": {"added": [], "skipped": []}}
 *          get           {"key": "key name"}                          {"success": true, "message": "OK/error message", "payload":  {"key": "key name", "value": "text value"}}
 *          del           {"key": "key name"}                          {"success": true, "message": "OK/error message key does not exists"}
 *          add/modify    {"key": "key name", "value": "text value"}   {"success": true, "message": "OK/error message"}
 * 
 * @note Cloudflare has a limit of 1000 worker invocations per operation, which is sufficient for most use cases.
 * 
 */

export async function onRequest(context) {
    const request = context.request;
    const rulesKV = context.env.NETWORK_RULES;
    const authToken = context.env.KVMAN_AUTH_TOKEN;

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
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), {
            headers: { "Content-Type": "text/json; charset=utf-8" },
        });
    }

    if (!rulesKV) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Not bind to KV NETWORK_RULES'
        }), {
            headers: { "Content-Type": "text/json; charset=utf-8" },
        });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    let response;
    try {
        if (action === 'export') {
            response = await exportFunc(rulesKV);
        }
        else if (action === 'list') {
            response = await listFunc(rulesKV);
        }
        else {
            const jsonData = await request.json();

            if (action === 'import') {
                response = await importFunc(rulesKV, jsonData);
            } else if (action === 'get') {
                response = await getFunc(rulesKV, jsonData);
            }
            else if (action === 'del') {
                response = await delFunc(rulesKV, jsonData);
            }
            else if (action === 'add') {
                response = await addFunc(rulesKV, jsonData);
            }
            else if (action === 'modify') {
                response = await addFunc(rulesKV, jsonData);
            }
            else {
                response = {
                    success: false,
                    message: `Invalid action ${action}`
                };
            }
        }
    } catch (e) {
        console.error('Error handling request:', e);

        response = {
            success: false,
            message: `Unexpected error ${e.message}`
        };
    }

    return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "text/json; charset=utf-8" },
    });
}

async function exportFunc(rulesKV) {
    const networkRules = await rulesKV.list();
    const ruleNames = networkRules.keys.map(rule => rule.name);

    const ruleItems = await Promise.all(ruleNames.map(async name => {
        const value = await rulesKV.get(name);
        return { name, value };
    }));

    return {
        success: true,
        message: 'OK',
        payload: ruleItems
    };
}

async function listFunc(rulesKV) {
    const networkRules = await rulesKV.list();
    const ruleNames = networkRules.keys.map(rule => rule.name);

    return {
        success: true,
        message: 'OK',
        payload: ruleNames
    };
}

async function importFunc(rulesKV, jsonData) {
    const addedKeys = [];
    const skippedKeys = [];

    for (let i = 0; i < jsonData.length; i++) {
        const item = jsonData[i];
        const key = item.name;
        const val = item.value;

        // check if the key already exists in the KV store
        const existingVal = await rulesKV.get(key);
        if (existingVal !== null) {
            skippedKeys.push(key);
            continue;
        }

        await rulesKV.put(key, val);
        addedKeys.push(key);
    }

    return {
        success: true,
        message: 'OK',
        payload: {
            added: addedKeys,
            skipped: skippedKeys
        }
    };
}

async function getFunc(rulesKV, jsonData) {
    const val = await rulesKV.get(jsonData.key);

    if (val === null) {
        return {
            success: false,
            message: `Key ${jsonData.key} does not exist`
        };
    }

    return {
        success: true,
        message: 'OK',
        payload: {
            key: jsonData.key,
            value: val
        }
    };
}

async function delFunc(rulesKV, jsonData) {
    const key = jsonData.key;
    const val = await rulesKV.get(key);

    if (val === null) {
        return {
            success: true,
            message: `Key ${key} does not exist`
        };
    }

    await rulesKV.delete(key);
    return {
        success: true,
        message: `Key ${key} deleted`
    };
}

async function addFunc(rulesKV, jsonData) {
    const key = jsonData.key;
    const val = jsonData.value;

    // If the key exists then this function will update the value
    const exists = await rulesKV.get(key);
    await rulesKV.put(key, val);

    if (!exists) {
        return {
            success: true,
            message: `Key ${key} added`
        };
    } else {
        return {
            success: true,
            message: `Value updated for key ${key}`
        };
    }
}
