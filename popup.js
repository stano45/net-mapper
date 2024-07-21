document.addEventListener('DOMContentLoaded', function() {
  let ipListDiv = document.getElementById('ip-list');
  let downloadBtn = document.getElementById('download-btn');
  let loadingDiv = document.getElementById('loading');

  // Load IP addresses and display them
  chrome.storage.local.get({ips: []}, function(result) {
    const ips = result.ips || [];
    ips.forEach(function(ip) {
      let ipElement = document.createElement('div');
      ipElement.textContent = ip;
      ipListDiv.appendChild(ipElement);
    });
  });

  // Function to batch IPs and fetch geolocation data
  async function fetchGeolocationData(ips) {
    const batches = [];
    const batchSize = 100;
    for (let i = 0; i < ips.length; i += batchSize) {
      batches.push(ips.slice(i, i + batchSize));
    }

    const geoData = [];
    for (let batch of batches) {
      let data = JSON.stringify(batch);
      let response = await fetch('http://ip-api.com/batch', {
        method: 'POST',
        body: data,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        let batchData = await response.json();
        geoData.push(...batchData);
      } else {
        console.error('Error fetching batch data, status:', response.status);
      }
    }
    return geoData;
  }

  // Fetch geolocation data and download when the button is clicked
  downloadBtn.addEventListener('click', function() {
    chrome.storage.local.get({ips: []}, async function(result) {
      const ips = result.ips || [];
      if (ips.length === 0) {
        alert("No IPs to download.");
        return;
      }

      loadingDiv.style.display = 'block';

      const ipCounts = ips.reduce((acc, ip) => {
        acc[ip] = (acc[ip] || 0) + 1;
        return acc;
      }, {});

      const uniqueIps = Object.keys(ipCounts);
      const geoData = await fetchGeolocationData(uniqueIps);

      // Add counts to geoData
      geoData.forEach(data => {
        data.count = ipCounts[data.query];
      });

      const blob = new Blob([JSON.stringify(geoData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      chrome.downloads.download({
        url: url,
        filename: 'ip-geo.json',
        saveAs: true
      });

      loadingDiv.style.display = 'none';
    });
  });
});
