document.addEventListener('DOMContentLoaded', function() {
    let ipListDiv = document.getElementById('ip-list');
  
    chrome.webRequest.onCompleted.addListener(
      function(details) {
        const ip = details.ip;
        if (ip) {
          let ipElement = document.createElement('div');
          ipElement.textContent = ip;
          ipListDiv.appendChild(ipElement);
        }
      },
      { urls: ["<all_urls>"] }
    );
  });
  