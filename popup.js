document.addEventListener('DOMContentLoaded', function() {
    let ipListDiv = document.getElementById('ip-list');
  
    chrome.storage.local.get({ips: []}, function(result) {
      const ips = result.ips || [];
      ips.forEach(function(ip) {
        let ipElement = document.createElement('div');
        ipElement.textContent = ip;
        ipListDiv.appendChild(ipElement);
      });
    });
  });
  