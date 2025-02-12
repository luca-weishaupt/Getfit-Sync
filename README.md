# (Unofficial) Getfit Sync Chrome Extension

This Chrome extension allows you to sync your Strava activities with your getfit account. It's a simple, lightweight tool that streamlines your fitness tracking and makes it easier to keep all your data in one place.

# Installation Guide

### 1. **Download & Unzip the Extension**

You have two options:

1. **Clone the Repository:**

    Open your terminal and run the following command:
    ```
    git clone https://github.com/luca-weishaupt/Getfit-Sync.git
    ```
    This will download the repository content into a folder named `Getfit-Sync`.

2. OR **Download as a ZIP File:**

    - Visit [https://github.com/luca-weishaupt/Getfit-Sync](https://github.com/luca-weishaupt/Getfit-Sync).
    - Click on the **Code** button.
    - Select **"Download ZIP"**.
    - Once downloaded, unzip the file to your desired location on your local drive.

---

### 2. **Load the Extension into Chrome**

- Open Google Chrome and type `chrome://extensions/` in the address bar.
- **Enable Developer Mode** by toggling the switch in the top right corner. 🔧
- Click on **"Load unpacked"** in the top left, then navigate to and select the folder where you unzipped the extension. 📂✅

<!-- Next we will include an image: imgs/dev_chrome.jpg -->
![Developer Mode in Chrome](imgs/dev_chrome.jpg)

---

### 3. **Get Your Authorization Callback Domain**

- In your extensions list, **right-click** the new **getfit sync** extension. (Tip: you can pin it for quick access!)
- Select **"Options"**.
- **Copy** the **"Authorization Callback Domain"** displayed. 📋🔑

![Options in getfit sync](imgs/select_options.jpg)

---

### 4. **Create a Strava App**

- Visit [Strava API](https://www.strava.com/settings/api). Log in, if prompted.
- Fill in your app details:
    - **Name, Description, and Icon:** Feel free to customize these! (Note: the icon is required – I’ve provided one for you if needed.) 🎨
    - **Club:** Leave this blank.
    - **Website:** Enter `http://localhost/exchange_token`
- **Paste** the **Authorization Callback Domain** you copied earlier into the appropriate field.
- Once created, you’ll receive a **Client ID** and **Client Secret**. Make sure to note these down! 🔐📝

---

### 5. **Configure the Extension with Strava Credentials**

- Return to the **Options** window of the getfit sync extension.
- **Enter** your Strava **Client ID** and **Client Secret**. 📥✨
- Hit "Save Configuration"
---

### 6. **Sync with getfit**

- Open [getfit](https://getfit.mit.edu/) and **log in** (if prompted). 👤💻
- Click on the **getfit sync extension icon** in your Chrome extensions menu.
- Press **"Sync Now"**. 🔄
- If prompted, **log in** to Strava and **allow access**. (Trust me – it’s all good!) 👍🔓

---

### 7. **Enjoy the Sync!**

- Once the sync completes, **refresh** the getfit page to see your updated data. 🎉🔄

---

Happy syncing! If you run into any issues, feel free to reach out. Enjoy your streamlined integration! 😄✨

## Disclaimer

This is an unnoficial chrome extension, that is not affiliated or endorsed in any way by Getfit. The code is distributed under the MIT [License](LICENSE).