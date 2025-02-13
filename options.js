// options.js

// Load and display current configuration, if any.
document.addEventListener("DOMContentLoaded", () => {
    const extensionId = chrome.runtime.id;
    const redirectURI = `https://${extensionId}.chromiumapp.org/`;
    document.getElementById("redirectUri").value = redirectURI;
    document.getElementById("redirectDomain").value = `${extensionId}.chromiumapp.org`;
    chrome.storage.local.get("config", (data) => {
        const currentConfigElem = document.getElementById("currentConfig");
        if (data && data.config) {
            currentConfigElem.innerText = "Current configuration:\n" + JSON.stringify(data.config, null, 2);
            document.getElementById("clientId").value = data.config.STRAVA_CLIENT_ID || "";
            document.getElementById("clientSecret").value = data.config.STRAVA_CLIENT_SECRET || "";
            // Set the radio button based on saved syncType
            const syncValue = data.config.syncType || "moving";
            document.querySelector(`input[name="syncType"][value="${syncValue}"]`).checked = true;
        } else {
            currentConfigElem.innerText = "No configuration set.";
        }
    });
});

// Save configuration using the radio button value for syncType
document.getElementById("saveButton").addEventListener("click", () => {
    const clientId = document.getElementById("clientId").value.trim();
    const clientSecret = document.getElementById("clientSecret").value.trim();
    const syncType = document.querySelector('input[name="syncType"]:checked').value;
    const extensionId = chrome.runtime.id;
    const redirectURI = `https://${extensionId}.chromiumapp.org/`;
    if (!clientId || !clientSecret) {
        document.getElementById("status").innerText = "Please fill in both Client ID and Client Secret.";
        return;
    }
    const config = {
        STRAVA_CLIENT_ID: clientId,
        STRAVA_CLIENT_SECRET: clientSecret,
        STRAVA_REDIRECT_URI: redirectURI,
        syncType
    };
    chrome.storage.local.set({ config }, () => {
        document.getElementById("status").innerText = "Configuration saved successfully!";
        document.getElementById("currentConfig").innerText = "Current configuration:\n" + JSON.stringify(config, null, 2);
    });
});

// New: Toggle the help message for sync type options
document.getElementById("syncHelpIcon").addEventListener("click", () => {
    const helpMsg = document.getElementById("syncHelpMessage");
    helpMsg.style.display = (helpMsg.style.display === "block") ? "none" : "block";
});
