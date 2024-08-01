import { getStorageData, setStorageData } from "./utils.js";

chrome.webRequest.onCompleted.addListener(
  async function (details) {
    const ip = details.ip;
    if (!ip) {
      return;
    }
    let ips = await getStorageData("ips");
    if (ips[ip]) {
      ips[ip] += 1;
    } else {
      ips[ip] = 1;
    }
    await setStorageData("ips", ips);
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("Received message:", message);
  sendResponse({ status: "logged" });
});
