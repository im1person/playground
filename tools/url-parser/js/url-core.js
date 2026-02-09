/**
 * Core URL parsing and display logic
 */
import { state, updateState } from './state.js';
import { showToast } from './utils.js';

export function updateUrlDisplays() {
  if (!state.currentUrlObj) return;
  const href = state.currentUrlObj.href;
  document.getElementById("generatedUrl").value = href;
  
  const urlInput = document.getElementById("urlInput");
  // Best Practice: Prevent cursor jump
  if (document.activeElement !== urlInput) {
    urlInput.value = href;
  }
}

export function updateGeneratedUrl() {
  if (!state.currentUrlObj) {
    const urlInput = document.getElementById("urlInput");
    if (!urlInput.value.trim()) {
      state.currentUrlObj = new URL("https://example.com");
    } else {
      try {
        state.currentUrlObj = new URL(urlInput.value.trim());
      } catch(e) {
        state.currentUrlObj = new URL("https://example.com");
      }
    }
  }

  const newParams = new URLSearchParams();
  const rows = document.querySelectorAll("#paramsTable tbody tr");
  if (rows.length > 0) {
    rows.forEach((row) => {
      const key = row.querySelector(".param-key").value;
      const value = row.querySelector(".param-value").value;
      if (key) {
        newParams.append(key, value);
      }
    });
  }

  state.currentUrlObj.search = newParams.toString();
  updateUrlDisplays();
}

export function updateUrlFromBulk() {
  if (!state.currentUrlObj) {
    state.currentUrlObj = new URL("https://example.com");
  }
  const text = document.getElementById("bulkEditTextarea").value;
  const lines = text.split("\n");
  const newParams = new URLSearchParams();

  lines.forEach((line) => {
    if (!line.trim()) return;
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

  state.currentUrlObj.search = newParams.toString();
  updateUrlDisplays();
}

export function renderPathSegments() {
  const container = document.getElementById("pathnameContainer");
  if (!state.currentUrlObj || !container) return;

  const pathname = state.currentUrlObj.pathname;
  const pathParts = pathname.substring(1).split("/");
  
  container.innerHTML = "";
  
  const startSlash = document.createElement("span");
  startSlash.className = "path-slash";
  startSlash.textContent = "/";
  container.appendChild(startSlash);

  pathParts.forEach((part, index) => {
    if (part === "" && index === pathParts.length - 1 && pathParts.length > 1) {
        return; 
    }

    const input = document.createElement("input");
    input.type = "text";
    input.className = "path-segment-input";
    input.value = decodeURIComponent(part);
    input.spellcheck = false;
    
    const setWidth = () => {
        const val = input.value || "";
        let displayWidth = 0;
        for (let i = 0; i < val.length; i++) {
            displayWidth += val.charCodeAt(i) > 127 ? 2 : 1;
        }
        input.style.width = (displayWidth + 2) + "ch";
    };
    setWidth();

    input.addEventListener("input", () => {
        setWidth();
        const allInputs = container.querySelectorAll(".path-segment-input");
        const newPath = "/" + Array.from(allInputs).map(i => i.value).join("/");
        state.currentUrlObj.pathname = newPath;
        updateUrlDisplays();
    });

    container.appendChild(input);

    if (index < pathParts.length - 1) {
      const slash = document.createElement("span");
      slash.className = "path-slash";
      slash.textContent = "/";
      container.appendChild(slash);
    }
  });

  if (pathname.length > 1 && pathname.endsWith("/")) {
      const endSlash = document.createElement("span");
      endSlash.className = "path-slash";
      endSlash.textContent = "/";
      container.appendChild(endSlash);
  }
}

export function renderParamsTable() {
  const queryParams = document.getElementById("queryParams");
  if (!queryParams) return;
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

  if (state.currentUrlObj && state.currentUrlObj.searchParams.size > 0) {
    state.currentUrlObj.searchParams.forEach((value, key) => {
      addParamRow(key, value, false);
    });
  }
}

export function renderBulkTextarea() {
  if (!state.currentUrlObj) return;
  const params = [];
  state.currentUrlObj.searchParams.forEach((value, key) => {
    params.push(`${key}:${value}`);
  });
  document.getElementById("bulkEditTextarea").value = params.join("\n");
}

export function addParamRow(key, value, updateUrl = true) {
  let tbody = document.querySelector("#paramsTable tbody");
  if (!tbody) {
    renderParamsTable();
    tbody = document.querySelector("#paramsTable tbody");
  }
  if (!tbody) return;

  const row = document.createElement("tr");

  const keyCell = document.createElement("td");
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className = "param-key";
  keyInput.value = key;
  keyInput.placeholder = "Key";
  keyCell.appendChild(keyInput);

  const valueCell = document.createElement("td");
  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.className = "param-value";
  valueInput.value = value;
  valueInput.placeholder = "Value";
  valueCell.appendChild(valueInput);

  const actionCell = document.createElement("td");
  actionCell.style.textAlign = "right";
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-icon delete-btn";
  deleteBtn.textContent = "✕";
  deleteBtn.setAttribute("data-en", "✕");
  deleteBtn.setAttribute("data-zh-Hant", "✕");
  actionCell.appendChild(deleteBtn);

  row.appendChild(keyCell);
  row.appendChild(valueCell);
  row.appendChild(actionCell);

  [keyInput, valueInput].forEach(inp => inp.addEventListener("input", updateGeneratedUrl));

  deleteBtn.addEventListener("click", () => {
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

export function parseUrl(silent = false) {
  const urlString = document.getElementById("urlInput").value.trim();

  if (!urlString) {
    if (!silent) showToast("Please enter a URL", "info");
    return;
  }

  try {
    let urlToParse = urlString;
    if (!urlToParse.match(/^https?:\/\//) && !urlToParse.startsWith("//")) {
      if (urlToParse.includes(".") && !urlToParse.includes(" ")) {
        urlToParse = "https://" + urlToParse;
      }
    }

    const urlObj = new URL(urlToParse);
    updateState({ currentUrlObj: urlObj });

    document.getElementById("protocol").textContent = urlObj.protocol;
    document.getElementById("host").textContent = urlObj.host;
    document.getElementById("port").textContent =
      urlObj.port ||
      (urlObj.protocol === "https:" ? "443" : urlObj.protocol === "http:" ? "80" : "-");
    document.getElementById("hash").textContent = urlObj.hash || "-";

    renderPathSegments();
    // These will be imported or attached globally if needed, but for now we'll handle in main
    window.dispatchEvent(new CustomEvent('url-parsed', { detail: { silent, urlString } }));

    updateUrlDisplays();
    document.title = `Parser: ${urlObj.hostname}`;
    
    if (!silent) showToast("URL parsed successfully", "success");

  } catch (e) {
    if (!silent) showToast("Invalid URL", "error");
    console.error(e);
  }
}
