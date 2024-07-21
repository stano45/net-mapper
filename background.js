chrome.webRequest.onCompleted.addListener(
    function(details) {
      const ip = details.ip;
      if (ip) {
        chrome.storage.local.get({ips: []}, function(result) {
          const ips = result.ips || [];
          if (!ips.includes(ip)) {
            ips.push(ip);
            chrome.storage.local.set({ips: ips}, function() {
              console.log("IP saved:", ip);
            });
          }
        });
      }
    },
    { urls: ["<all_urls>"] }
  );
  