// extension/popup.js
// EatSafe HK Toolbar Popup Controller

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusIndicator = document.getElementById("status-indicator");
  const recordCountEl = document.getElementById("record-count");
  const syncDateEl = document.getElementById("sync-date");
  const recentListEl = document.getElementById("recent-list");
  const clearCacheBtn = document.getElementById("clear-cache-btn");

  // Handle Clear Cache action
  clearCacheBtn?.addEventListener("click", () => {
    clearCacheBtn.disabled = true;
    clearCacheBtn.textContent = "Clearing...";
    chrome.runtime.sendMessage({ action: "CLEAR_CACHE" }, (res) => {
      const ok = !chrome.runtime.lastError && res && res.success;
      clearCacheBtn.textContent = ok ? "✅ Cache Cleared!" : "⚠️ Could not clear cache";
      if (ok) {
        recentListEl.innerHTML =
          '<div class="empty-state">Cache cleared! Stale records removed. Fresh live data will load on your next Google Maps lookup.</div>';
      }
      setTimeout(() => {
        clearCacheBtn.disabled = false;
        clearCacheBtn.textContent = "🔄 Clear Extension Cache";
      }, 2000);
    });
  });

  try {
    // Check background service worker health
    chrome.runtime.sendMessage({ action: "CHECK_HEALTH" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.online) {
        statusIndicator.className = "status-pill status-offline";
        statusIndicator.textContent = "Offline";
        recordCountEl.textContent = "Server offline";
        syncDateEl.textContent = "—";
      } else {
        statusIndicator.className = "status-pill status-online";
        statusIndicator.textContent = "Active";
        recordCountEl.textContent = response.totalRecords
          ? `${Number(response.totalRecords).toLocaleString()} premises`
          : "Online";
        syncDateEl.textContent = response.generationDate || "Live D1";
      }
    });

    // Load last 10 recent lookups from storage
    const stored = await chrome.storage.local.get("recentLookups");
    const recent = Array.isArray(stored.recentLookups) ? stored.recentLookups : [];

    if (recent.length > 0) {
      recentListEl.innerHTML = recent
        .slice(0, 10)
        .map((item) => {
          // Same precedence as the in-page card: an unconfirmed branch match is never shown as clean/suspended
          const isUnverified = item.matchConfidence === "LOW";
          const badgeClass = isUnverified
            ? "badge-unverified"
            : item.status === "SUSPENDED"
              ? "badge-suspended"
              : item.status === "DEMERIT_WARNING" || item.status === "PREVIOUSLY_SUSPENDED"
              ? "badge-warning"
              : "badge-clean";

          const badgeLabel = isUnverified
            ? "Unverified"
            : item.status === "SUSPENDED"
              ? "Suspended"
              : item.status === "DEMERIT_WARNING" || item.status === "PREVIOUSLY_SUSPENDED"
              ? "Past Record"
              : item.status === "PREPACKAGED_RETAIL"
              ? "Exempt Retail"
              : "No Suspensions";

          return `
            <div class="recent-item">
              <span class="recent-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
              <span class="badge-tag ${badgeClass}">${badgeLabel}</span>
            </div>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error("Popup init error:", err);
  }
});
