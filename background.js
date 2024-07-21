chrome.webRequest.onCompleted.addListener(
    function(details) {
      const ip = details.ip;
      if (ip) {
        console.log("Connected IP:", ip);
      }
    },
    { urls: ["<all_urls>"] }
  );
  