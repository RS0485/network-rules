/**
 * @summary Generates a webpage from the list of Clash rulesets on GitHub.
 * @version 1.0.0
 * 
 * @example https://www.example.com/rulesets/
 */


/**
 * Generates a webpage from the list of files in the 
 * RS0485/V2rayDomains2Clash/generated/ directory on GitHub.
 */
export async function onRequest(context) {
    // Fetch the list of files from GitHub.
    const response = await fetch(
        "https://raw.githubusercontent.com/RS0485/V2rayDomains2Clash/generated/rulesets.json",
        {
            headers: {
                Referer: "https://github.com/RS0485",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36",
            },
        }
    );

    // Throw an error if the response is not okay.
    if (!response.ok) {
        return new Response("Error response from GitHub API", { status: response.status });
    }

    // Parse the response content as JSON.
    const content = await response.text();

    // Build the HTML for the webpage.
    const html = `<!DOCTYPE html>
  <html>
  
  <head>
      <title>Clash RuleSets</title>
      <style>
          .label {
              display: inline-block;
              padding: 5px 10px;
              background-color: #333;
              color: #fff;
              border-radius: 5px;
              margin: 10px;
          }
  
          label,
          input[type="text"] {
              display: inline-block;
              margin-bottom: 8px;
              font-size: 16px;
              font-weight: bold;
          }
  
          input[type="text"] {
              padding: 8px;
              border: 1px solid #ccc;
              border-radius: 4px;
              box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
              transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
          }
  
          input[type="text"]:focus {
              border-color: #66afe9;
              outline: 0;
              box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 5px rgba(102, 175, 233, 0.5);
          }
  
          table {
              border-collapse: collapse;
              width: auto;
              width: 100%;
          }
  
          th,
          td {
              text-align: left;
              padding: 8px;
          }
  
          tr:nth-child(even) {
              background-color: #f2f2f2;
          }
      </style>
  </head>
  
  <body>
      <div class="label">Total RuleSets:<span id="total-count"></span></div>
      <div class="label">Update Time: <span id="updated-time"></span></div>
  
      <label for="filter">Filter:</label>
      <input type="text" id="filter" name="filter">
  
      <table id="rulelist">
          <thead>
              <tr>
                  <th>Name</th>
                  <th>Rules</th>
                  <th>Behavior</th>
              </tr>
          </thead>
          <tbody>
  
          </tbody>
      </table>
      <script>
          const data = ${content} 
  
          const totalCount = data.count;
          const updateTime = new Date(data.updateTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
          document.getElementById('total-count').textContent = totalCount;
          document.getElementById('updated-time').textContent = updateTime;
  
          const ruleSets = data.ruleSets;
          const tableBody = document.querySelector('#rulelist tbody');
  
          ruleSets.forEach(ruleSet => {
              const row = document.createElement('tr');
              const nameCell = document.createElement('td');
  
              const link = document.createElement('a');
              link.href = '/gh/RS0485/V2rayDomains2Clash/generated/' + ruleSet.name + '.yaml';
              link.target = '_blank';
              link.textContent = ruleSet.name;
              nameCell.appendChild(link);
              row.appendChild(nameCell);
  
              const countCell = document.createElement('td');
              countCell.textContent = ruleSet.count;
              row.appendChild(countCell);
  
              const behaviorCell = document.createElement('td');
              behaviorCell.textContent = ruleSet.behavior;
              row.appendChild(behaviorCell);
              tableBody.appendChild(row);
          });
  
          // Filter by name
          const filterInput = document.getElementById('filter');
          const tableRows = document.querySelectorAll('#rulelist tbody tr');
  
          filterInput.addEventListener('input', () => {
              const filterValue = filterInput.value.toLowerCase();
  
              tableRows.forEach(row => {
                  const rowText = row.textContent.toLowerCase();
                  if (rowText.includes(filterValue)) {
                      row.style.display = '';
                  } else {
                      row.style.display = 'none';
                  }
              });
          });
      </script>
  </body>
  
  </html>`;

    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            'Cache-Control': 'max-age=86400'
        },
    });
}
