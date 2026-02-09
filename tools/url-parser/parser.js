let currentUrlObj = null;
let isBulkMode = false;

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
    btn.textContent = (currentLocale === "zh-HK" || currentLocale === "zh-Hant") ? "已複製!" : "Copied!";
    setTimeout(() => (btn.textContent = originalText), 2000);
  });
});

document
  .getElementById("bulkEditToggle")
  .addEventListener("click", toggleBulkEdit);
document
  .getElementById("bulkEditTextarea")
  .addEventListener("input", updateUrlFromBulk);

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

    // Render both views (or at least prep them)
    renderParamsTable();
    renderBulkTextarea();

    // Update Generated URL based on current state (which matches URL input initially)
    document.getElementById("generatedUrl").value = currentUrlObj.href;

    if (window.updateLocale) {
      window.updateLocale(localStorage.getItem("playground-locale") || "en");
    }
  } catch (e) {
    alert("Invalid URL");
    console.error(e);
  }
}

function renderParamsTable() {
  const queryParams = document.getElementById("queryParams");
  queryParams.innerHTML = "";

  const table = document.createElement("table");
  table.className = "params-table";
  table.id = "paramsTable";
  table.innerHTML = `
      <thead>
        <tr>
          <th data-en="Key" data-zh-HK="鍵" style="width: 40%">Key</th>
          <th data-en="Value" data-zh-HK="值" style="width: 45%">Value</th>
          <th style="width: 15%"></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
  queryParams.appendChild(table);

  if (currentUrlObj && currentUrlObj.searchParams.size > 0) {
    currentUrlObj.searchParams.forEach((value, key) => {
      addParamRow(key, value, false);
    });
  }
}

function renderBulkTextarea() {
  if (!currentUrlObj) return;
  const params = [];
  currentUrlObj.searchParams.forEach((value, key) => {
    params.push(`${key}:${value}`);
  });
  document.getElementById("bulkEditTextarea").value = params.join("\n");
}

function addParamRow(key, value, updateUrl = true) {
  const tbody = document.querySelector("#paramsTable tbody");
  // Safety check if table exists (might not if we haven't parsed yet)
  if (!tbody) return;

  const row = document.createElement("tr");

  row.innerHTML = `
      <td><input type="text" class="param-key" value="${escapeHtml(
        key
      )}" placeholder="Key"></td>
      <td><input type="text" class="param-value" value="${escapeHtml(
        value
      )}" placeholder="Value"></td>
      <td style="text-align: right;">
          <button class="btn btn-icon delete-btn" data-en="✕" data-zh-HK="✕">✕</button>
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
  // Updates from Table View
  if (!currentUrlObj) return;

  const newParams = new URLSearchParams();
  // Check if table exists
  const rows = document.querySelectorAll("#paramsTable tbody tr");
  if (rows.length > 0) {
    rows.forEach((row) => {
      const key = row.querySelector(".param-key").value;
      const value = row.querySelector(".param-value").value;
      if (key) {
        newParams.append(key, value);
      }
    });
  } else if (!isBulkMode) {
    // If in table mode and no rows, params are empty
    // (If in bulk mode, we don't use this function usually, but see logic below)
  }

  currentUrlObj.search = newParams.toString();
  document.getElementById("generatedUrl").value = currentUrlObj.href;
}

function updateUrlFromBulk() {
  // Updates from Bulk View
  if (!currentUrlObj) return;
  const text = document.getElementById("bulkEditTextarea").value;
  const lines = text.split("\n");
  const newParams = new URLSearchParams();

  lines.forEach((line) => {
    if (!line.trim()) return;
    // Split by first colon only
    const separatorIndex = line.indexOf(":");
    if (separatorIndex !== -1) {
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();
      if (key) newParams.append(key, value);
    } else {
      const key = line.trim();
      if (key) newParams.append(key, "");
    }
  });

  currentUrlObj.search = newParams.toString();
  document.getElementById("generatedUrl").value = currentUrlObj.href;
}

function toggleBulkEdit() {
  isBulkMode = !isBulkMode;
  const tableContainer = document.getElementById("queryParams");
  const addBtn = document.getElementById("addParamBtn");
  const bulkContainer = document.getElementById("bulkEditContainer");
  const toggleBtn = document.getElementById("bulkEditToggle");
  const card = document.getElementById("queryParamsCard");

  if (isBulkMode) {
    // Switching to Bulk
    // First ensure bulk text is up to date with current URL object (which matches table)
    renderBulkTextarea();

    tableContainer.style.display = "none";
    addBtn.style.display = "none";
    bulkContainer.style.display = "block";
    // card.classList.add("grid-full"); // No longer needed with flex layout

    toggleBtn.setAttribute("data-en", "Key-Value Edit");
    toggleBtn.setAttribute("data-zh-HK", "表格編輯");
  } else {
    // Switching to Table
    // Ensure table is up to date with current URL object (which matches bulk text)
    renderParamsTable();

    tableContainer.style.display = "block";
    addBtn.style.display = "inline-flex";
    bulkContainer.style.display = "none";
    // card.classList.remove("grid-full"); // No longer needed with flex layout

    toggleBtn.setAttribute("data-en", "Bulk Edit");
    toggleBtn.setAttribute("data-zh-HK", "批量編輯");
  }

  if (window.updateLocale) {
    window.updateLocale(localStorage.getItem("playground-locale") || "en");
  }
}

function escapeHtml(text) {
  return text.replace(/"/g, "&quot;");
}
