let currentUrlObj = null;

document.getElementById("parseBtn").addEventListener("click", parseUrl);
document.getElementById("urlInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") parseUrl();
});

document.getElementById("pasteBtn").addEventListener("click", async () => {
  document.getElementById("urlInput").value = "";
  document.getElementById("urlInput").focus();
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById("urlInput").value = text;
    parseUrl();
  } catch (err) {
    console.error("Failed to read clipboard: ", err);
    alert("Failed to access clipboard.");
  }
});

document.getElementById("addParamBtn").addEventListener("click", () => {
  addParamRow("", "");
  updateGeneratedUrl();
});

document.getElementById("copyBtn").addEventListener("click", () => {
  const copyText = document.getElementById("generatedUrl");
  copyText.select();
  navigator.clipboard.writeText(copyText.value).then(() => {
    const btn = document.getElementById("copyBtn");
    const originalText = btn.textContent;
    const currentLocale = localStorage.getItem("playground-locale") || "en";
    btn.textContent = currentLocale === "zh-Hant" ? "已複製!" : "Copied!";
    setTimeout(() => (btn.textContent = originalText), 2000);
  });
});

function parseUrl() {
  const urlString = document.getElementById("urlInput").value.trim();
  const resultSection = document.getElementById("resultSection");

  if (!urlString) return;

  try {
    let urlToParse = urlString;
    if (!urlToParse.match(/^https?:\/\//) && !urlToParse.startsWith("//")) {
      if (urlToParse.includes(".") && !urlToParse.includes(" ")) {
        urlToParse = "https://" + urlToParse;
      }
    }

    currentUrlObj = new URL(urlToParse);
    const url = currentUrlObj;

    document.getElementById("protocol").textContent = url.protocol;
    document.getElementById("host").textContent = url.host;
    document.getElementById("port").textContent =
      url.port ||
      (url.protocol === "https:"
        ? "443"
        : url.protocol === "http:"
        ? "80"
        : "-");
    document.getElementById("pathname").textContent = url.pathname;
    document.getElementById("hash").textContent = url.hash || "-";

    const queryParams = document.getElementById("queryParams");
    queryParams.innerHTML = "";

    const table = document.createElement("table");
    table.className = "params-table";
    table.id = "paramsTable";
    table.innerHTML = `
      <thead>
        <tr>
          <th data-en="Key" data-zh-Hant="鍵" style="width: 40%">Key</th>
          <th data-en="Value" data-zh-Hant="值" style="width: 45%">Value</th>
          <th style="width: 15%"></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    queryParams.appendChild(table);

    if (url.searchParams.size > 0) {
      url.searchParams.forEach((value, key) => {
        addParamRow(key, value, false);
      });
    } else {
      // If empty, we might want to show an empty row or just the table headers
      // Keep it empty for now, user can add
    }

    // Ensure result section is visible (it uses display: contents, but we might want to toggle visibility of children if we wanted to hide before parse)
    // Since we changed layout, let's just assume it's always visible or valid

    updateGeneratedUrl();

    if (window.updateLocale) {
      window.updateLocale(localStorage.getItem("playground-locale") || "en");
    }
  } catch (e) {
    alert("Invalid URL");
    console.error(e);
  }
}

function addParamRow(key, value, updateUrl = true) {
  const tbody = document.querySelector("#paramsTable tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
      <td><input type="text" class="param-key" value="${escapeHtml(
        key
      )}" placeholder="Key"></td>
      <td><input type="text" class="param-value" value="${escapeHtml(
        value
      )}" placeholder="Value"></td>
      <td style="text-align: right;">
          <button class="btn btn-icon delete-btn" data-en="✕" data-zh-Hant="✕">✕</button>
      </td>
  `;

  const inputs = row.querySelectorAll("input");
  inputs.forEach((input) => {
    input.addEventListener("input", updateGeneratedUrl);
  });

  row.querySelector(".delete-btn").addEventListener("click", () => {
    row.remove();
    updateGeneratedUrl();
  });

  tbody.appendChild(row);

  if (updateUrl) {
    if (window.updateLocale) {
      window.updateLocale(localStorage.getItem("playground-locale") || "en");
    }
  }
}

function updateGeneratedUrl() {
  if (!currentUrlObj) return;

  const newParams = new URLSearchParams();
  document.querySelectorAll("#paramsTable tbody tr").forEach((row) => {
    const key = row.querySelector(".param-key").value;
    const value = row.querySelector(".param-value").value;
    if (key) {
      newParams.append(key, value);
    }
  });

  currentUrlObj.search = newParams.toString();
  document.getElementById("generatedUrl").value = currentUrlObj.href;
}

function escapeHtml(text) {
  return text.replace(/"/g, "&quot;");
}
