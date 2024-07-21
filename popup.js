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

  // Fetch geolocation data and download when the button is clicked
  downloadBtn.addEventListener('click', function() {
    chrome.storage.local.get({ips: []}, async function(result) {
      console.log('Fetching geolocation data for IPs:', result.ips);
      const ips = result.ips || [];
      const geoData = [];

      for (let ip of ips) {
        console.log('Fetching data for IP:', ip);
        try {
          let response = await fetch(`http://ip-api.com/json/${ip}`);
          if (!response.ok) {
            console.error(`Error fetching data for IP: ${ip}, status: ${response.status}`);
            continue;
          }
          let data = await response.json();
          geoData.push(data);
        } catch (error) {
          console.error('Error fetching geolocation data for IP:', ip, error);
        }
      }

      const blob = new Blob([JSON.stringify(geoData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      chrome.downloads.download({
        url: url,
        filename: 'ip-geo.json',
        saveAs: true
      });
    });
  });
});
