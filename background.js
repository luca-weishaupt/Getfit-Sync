// background.js

// Load our configuration values from chrome.storage.local
// We will wait for the configuration to be available before proceeding.
function getConfig() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("config", (result) => {
            if (result.config) {
                resolve(result.config);
            } else {
                reject("No configuration found. Please go to the Options page and enter your secret key.");
            }
        });
    });
}

// Load Luxon and our configuration file (if you had one) via importScripts.
importScripts("luxon.min.js");

// --- OAuth with Strava using configuration from getConfig() ---
async function authenticateStrava() {
    const config = await getConfig();
    const STRAVA_CLIENT_ID = config.STRAVA_CLIENT_ID;
    const STRAVA_CLIENT_SECRET = config.STRAVA_CLIENT_SECRET;
    const STRAVA_REDIRECT_URI = config.STRAVA_REDIRECT_URI;
    const scope = "activity:read_all";
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&approval_prompt=auto&scope=${scope}`;
    console.log("Launching OAuth flow with URL:", authUrl);

    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
            { url: authUrl, interactive: true },
            async (redirectUrl) => {
                if (chrome.runtime.lastError || !redirectUrl) {
                    console.error("OAuth flow error:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError || "No redirect URL");
                    return;
                }
                console.log("Redirect URL received:", redirectUrl);
                const urlObj = new URL(redirectUrl);
                const code = urlObj.searchParams.get("code");
                if (!code) {
                    reject("No code found in redirect URL");
                    return;
                }
                console.log("Authorization code:", code);
                try {
                    const tokenResp = await fetch("https://www.strava.com/api/v3/oauth/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            client_id: STRAVA_CLIENT_ID,
                            client_secret: STRAVA_CLIENT_SECRET,
                            code: code,
                            grant_type: "authorization_code"
                        })
                    });
                    if (!tokenResp.ok) {
                        const errText = await tokenResp.text();
                        console.error("Token exchange failed:", tokenResp.status, errText);
                        reject("Token exchange failed: " + tokenResp.status);
                        return;
                    }
                    const tokenData = await tokenResp.json();
                    console.log("Token data received:", tokenData);
                    chrome.storage.local.set({ stravaToken: tokenData }, () => {
                        resolve(tokenData);
                    });
                } catch (err) {
                    console.error("Error during token exchange:", err);
                    reject(err);
                }
            }
        );
    });
}

function getStoredToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get("stravaToken", (result) => {
            resolve(result.stravaToken || null);
        });
    });
}

// Keep-alive helpers (as before)
function startKeepAlive() {
    chrome.alarms.create("keepAlive", { delayInMinutes: 0.5 });
}
function stopKeepAlive() {
    chrome.alarms.clear("keepAlive");
}

// --- Luxon helper functions ---
const BASE_DATE_EASTERN = luxon.DateTime.fromISO("2025-02-03T00:00:00", { zone: "America/New_York" });
function computeWeek(startDateISO) {
    let dtUtc = luxon.DateTime.fromISO(startDateISO, { zone: "utc" });
    let dtEastern = dtUtc.setZone("America/New_York");
    const diffDays = dtEastern.diff(BASE_DATE_EASTERN, "days").days;
    return Math.floor(diffDays / 7) + 1;
}
function cleanActivityType(activityTypeStr) {
    if (activityTypeStr.startsWith("root=")) {
        return activityTypeStr.slice(6, -1).toLowerCase();
    }
    return activityTypeStr.toLowerCase();
}

// --- Get User-Specific Getfit Parameters ---
// (These come from the live Getfit API so that each user’s UID, challenge_id, and team_id are used.)
async function getUserParametersFromGetfit() {
    const url = "https://getfit.mit.edu/api/getEnterMinutesData";
    const response = await fetch(url, {
        headers: {
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0",
            "Cache-Control": "no-cache"
        },
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Failed to fetch Getfit user data: " + response.status);
    }
    const data = await response.json();
    if (data.data && data.data.my_ranking) {
        console.log("Retrieved user parameters from Getfit:", data.data.my_ranking);
        return data.data.my_ranking;
    }
    throw new Error("Getfit user parameters not found in API response.");
}

async function fetchStravaActivities(tokenData, syncType) {
    const token = tokenData.access_token;
    const todayUtc = luxon.DateTime.utc();
    const mostRecentMonday = todayUtc.minus({ days: todayUtc.weekday - 1 }).startOf("day");
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(mostRecentMonday.toSeconds())}`;
    const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: "no-cache"
    });
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized: The Strava token may be invalid or expired. Please check your configuration.');
        }
        throw new Error('Failed to fetch Strava activities: ' + response.status);
    }
    const activities = await response.json();
    return activities.map(act => {
        let dtUtc = luxon.DateTime.fromISO(act.start_date, { zone: "utc" });
        let dtEastern = dtUtc.setZone("America/New_York").startOf("day");
        let dtUtcFloor = dtEastern.setZone("utc");
        const originalMovingMinutes = Math.round(act.moving_time / 60);
        const computedDuration = (syncType === "total")
            ? Math.round(act.elapsed_time / 60)
            : originalMovingMinutes;
        return {
            id: String(act.id),
            activity_name: act.name,
            activity_type: String(act.type),
            start_date: dtUtcFloor.toISO(),
            duration_minutes: computedDuration,
            original_moving_minutes: originalMovingMinutes
        };
    });
}

async function fetchUploadedFromGetfit() {
    const url = "https://getfit.mit.edu/api/getEnterMinutesData";
    const response = await fetch(url, {
        headers: {
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0",
            "Cache-Control": "no-cache"
        },
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Failed to fetch Getfit data: " + response.status);
    }
    const data = await response.json();
    const minutesList = (data.data && data.data.minutes) || [];
    const uploadedSet = new Set();
    minutesList.forEach(entry => {
        let key = `${entry.date}|${entry.activity_name.toLowerCase()}|${entry.duration}`;
        uploadedSet.add(key);
    });
    return uploadedSet;
}

async function buildGetfitPayload(activity) {
    const userParams = await getUserParametersFromGetfit();
    const intensityMapping = { low: 10, medium: 11, high: 12 };
    const intensity_tid = intensityMapping["medium"];
    const week_num = computeWeek(activity.start_date);
    const timestamp_str = String(Math.floor(luxon.DateTime.fromISO(activity.start_date, { zone: "utc" }).toSeconds()));
    return {
        uid: userParams.uid,
        challenge_id: userParams.challenge_id,
        week: week_num,
        team_id: userParams.team_id,
        activity_tid: null,
        activity_name: cleanActivityType(activity.activity_type),
        intensity_tid: intensity_tid,
        duration: String(activity.duration_minutes),
        date: timestamp_str
    };
}

async function submitActivityToGetfit(payload) {
    const url = "https://getfit.mit.edu/api/addMinutes";
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify(payload),
        credentials: "include"
    });
    return response;
}

async function syncActivities() {
    console.log("Starting sync in background...");
    startKeepAlive();
    try {
        let tokenData = await getStoredToken();
        if (!tokenData) {
            console.log("No stored Strava token; starting OAuth flow.");
            tokenData = await authenticateStrava();
        }
        console.log("Using Strava token:", tokenData.access_token);
        const config = await getConfig();
        const syncType = config.syncType || "moving";
        let activities;
        try {
            activities = await fetchStravaActivities(tokenData, syncType);
        } catch (e) {
            if (e.message.includes("Unauthorized")) {
                console.warn("Token expired, triggering re-authentication.");
                tokenData = await authenticateStrava();
                activities = await fetchStravaActivities(tokenData, syncType);
            } else {
                throw e;
            }
        }
        console.log(`Fetched ${activities.length} activities from Strava.`);
        const duplicateSet = await fetchUploadedFromGetfit();
        console.log("Already uploaded keys:", duplicateSet);
        // Use computed duration in key checking.
        const newActivities = activities.filter(act => {
            const key = `${String(Math.floor(luxon.DateTime.fromISO(act.start_date, { zone: "utc" }).toSeconds()))}|${cleanActivityType(act.activity_type)}|${act.duration_minutes}`;
            if (duplicateSet.has(key)) {
                console.log(`Skipping duplicate activity ${act.id} with key ${key}`);
                return false;
            }
            return true;
        });
        console.log(`Found ${newActivities.length} new activities to upload.`);
        for (let act of newActivities) {
            const payload = await buildGetfitPayload(act);
            console.log("Submitting payload:", payload);
            const resp = await submitActivityToGetfit(payload);
            if (resp.ok) {
                const result = await resp.json();
                console.log(`Activity ${act.id} uploaded successfully.`, result);
                // Update duplicate set using the computed duration.
                const key = `${String(Math.floor(luxon.DateTime.fromISO(act.start_date, { zone: "utc" }).toSeconds()))}|${cleanActivityType(act.activity_type)}|${act.duration_minutes}`;
                duplicateSet.add(key);
                chrome.storage.local.set({ uploadedIDs: Array.from(duplicateSet) });
            } else {
                const errText = await resp.text();
                console.error(`Error uploading activity ${act.id}:`, resp.status, errText);
            }
        }
        console.log("Sync complete.");
    } catch (err) {
        console.error("Error during sync:", err);
    }
    stopKeepAlive();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "authenticateStrava") {
        authenticateStrava()
            .then(tokenData => {
                chrome.storage.local.set({ stravaToken: tokenData }, () => {
                    sendResponse({ success: true, tokenData: tokenData });
                });
            })
            .catch(err => {
                sendResponse({ success: false, error: String(err) });
            });
        return true;
    }
    if (message.action === "startSync") {
        syncActivities()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: String(err) }));
        return true;
    }
});
