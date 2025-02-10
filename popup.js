// popup.js

document.getElementById("syncButton").addEventListener("click", () => {
    const statusElem = document.getElementById("status");
    // Check if configuration is saved
    chrome.storage.local.get("config", (data) => {
        if (!data || !data.config) {
            statusElem.innerText = "Configuration missing.\nPlease open Options and configure the extension.";
            return;
        }
        statusElem.innerText = "Starting sync in background...";
        chrome.runtime.sendMessage({ action: "startSync" }, (response) => {
            if (response && response.success) {
                statusElem.innerText += "\nSync complete.";
            } else {
                statusElem.innerText += "\nSync failed: " + (response.error || "Unknown error");
            }
        });
    });
});
