chrome.webRequest.onCompleted.addListener(
  function (details) {
    const ip = details.ip;
    if (ip) {
      chrome.storage.local.get({ ips: {} }, function (result) {
        let ips = result.ips || {};
        if (ips[ip]) {
          ips[ip] += 1;
        } else {
          ips[ip] = 1;
        }
        chrome.storage.local.set({ ips: ips }, function () {
          console.log("IPs updated:", ips, ip);
        });
      });
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("Received message:", message);
  sendResponse({ status: "logged" });
});
