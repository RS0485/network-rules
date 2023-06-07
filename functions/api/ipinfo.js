/**
 * @summary IP info API
 * @description Get IP info from Cloudflare and serve a json API
 * @version 1.0.0
 * 
 * @example https://www.example.com/api/ipinfo?format=json
 */

export async function onRequest(context) {
  const request = context.request;
  const { searchParams } = new URL(request.url);
  let format = searchParams.get('format') || 'html';

  const ipinfo = {};
  ipinfo.success = true;
  ipinfo.message = "OK";

  ipinfo.ip = request.headers.get("x-real-ip");

  ipinfo.as = {};
  ipinfo.as["asn"] = request.cf["asn"];
  ipinfo.as["org"] = request.cf["asOrganization"];

  ipinfo.geolocation = {};
  ipinfo.geolocation["country"] = request.cf["country"];
  ipinfo.geolocation["region"] = request.cf["region"] || "";
  ipinfo.geolocation["regionCode"] = request.cf["regionCode"] || "";
  ipinfo.geolocation["city"] = request.cf["city"];
  ipinfo.geolocation["longitude"] = request.cf["longitude"];
  ipinfo.geolocation["latitude"] = request.cf["latitude"];
  ipinfo.geolocation["timezone"] = request.cf["timezone"];
  ipinfo.geolocation["colo"] = request.cf["colo"];

  ipinfo.headers = {};
  ipinfo.headers["url"] = request.url;
  ipinfo.headers["httpProtocol"] = request.cf["httpProtocol"];
  ipinfo.headers["user-agent"] = request.headers.get("user-agent");
  ipinfo.headers["x-forwarded-for"] = request.headers.get("x-forwarded-for");
  ipinfo.headers["x-real-ip"] = request.headers.get("x-real-ip");
  ipinfo.headers["accept-language"] = request.headers.get("accept-language") || "";

  if (format === 'json') {
    return new Response(JSON.stringify(ipinfo), {
      headers: { "Content-Type": "application/json" },
    });
  }
  else {
    return new Response(renderAsHTML(ipinfo), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function renderAsHTML(ipinfo) {
  const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>IP Infomation</title>
      <style>
        body {
          background-color: #f2f2f2;
          font-family: Arial, sans-serif;
        }
    
        h1 {
          text-align: center;
          color: #333;
        }
    
        h2 {
          margin-top: 20px;
          font-size: 20px;
          color: #666;
        }
    
        p {
          font-size: 18px;
          line-height: 1.5;
          color: #555;
          margin-bottom: 10px;
        }
    
        #ip {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
    
        #country {
          text-transform: uppercase;
        }
    
        #region, #city {
          text-transform: capitalize;
        }
    
        #timezone {
          font-style: italic;
        }
    
        pre {
          white-space: pre-wrap;
          font-size: 16px;
          line-height: 1.5;
          color: #555;
          background-color: #f9f9f9;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <h1>IP Infomation</h1>
      <p id="ip"></p>
      <h2>ASN</h2>
      <pre id="as"></pre>
      <h2>Geolocation</h2>
      <pre id="geolocation"></pre>
      <h2>Headers</h2>
      <pre id="headers"></pre>
    
      <script>
        const jsonData = ${JSON.stringify(ipinfo)};
        const ipElement = document.getElementById('ip');
        const asElement = document.getElementById('as');
        const geolocationElement = document.getElementById('geolocation');
        const headersElement = document.getElementById('headers');
    
        ipElement.innerText = "IP Address: ${ipinfo.ip}";
        asElement.innerText = JSON.stringify(jsonData.as, null, 2);
        geolocationElement.innerText = JSON.stringify(jsonData.geolocation, null, 2);
        headersElement.innerText = JSON.stringify(jsonData.headers, null, 2);
      </script>
    </body>
    </html>`;

  return html;
}
