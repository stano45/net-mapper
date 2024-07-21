document.addEventListener('DOMContentLoaded', function() {
    let ipListDiv = document.getElementById('ip-list');
    let downloadBtn = document.getElementById('download-btn');
  
    // Load IP addresses and display them
    chrome.storage.local.get({ips: []}, function(result) {
      const ips = result.ips || [];
      ips.forEach(function(ip) {
        let ipElement = document.createElement('div');
        ipElement.textContent = ip;
        ipListDiv.appendChild(ipElement);
      });
    });
  
    // Download IP addresses when the button is clicked
    downloadBtn.addEventListener('click', function() {
      chrome.storage.local.get({ips: []}, function(result) {
        const ips = result.ips || [];
        const blob = new Blob([ips.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
  
        chrome.downloads.download({
          url: url,
          filename: 'logged_ips.txt',
          saveAs: true
        });
      });
    });
  });
  