document.addEventListener('DOMContentLoaded', function() {
  function logToBackground(message) {
    chrome.runtime.sendMessage({log: message}, function(response) {
      console.log('Background response:', response);
    });
  }

  logToBackground('Popup DOMContentLoaded');

  let ipListDiv = document.getElementById('ip-list');
  let downloadBtn = document.getElementById('download-btn');
  let mapBtn = document.getElementById('map-btn');
  let loadingDiv = document.getElementById('loading');
  let mapDiv = document.getElementById('map');

  // Load IP addresses and display them
  chrome.storage.local.get({ips: []}, function(result) {
    logToBackground('Fetched IPs: ' + JSON.stringify(result.ips));
    const ips = result.ips || [];
    ips.forEach(function(ip) {
      let ipElement = document.createElement('div');
      ipElement.textContent = ip;
      ipListDiv.appendChild(ipElement);
    });
  });

  // Function to batch IPs and fetch geolocation data
  async function fetchGeolocationData(ips) {
    logToBackground('Fetching geolocation data for IPs: ' + JSON.stringify(ips));
    const batches = [];
    const batchSize = 100;
    for (let i = 0; i < ips.length; i += batchSize) {
      batches.push(ips.slice(i, i + batchSize));
    }

    const geoData = [];
    for (let batch of batches) {
      let data = JSON.stringify(batch);
      let response = await fetch('http://ip-api.com/batch?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,mobile,proxy,hosting,query', {
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
        logToBackground('Error fetching batch data, status: ' + response.status);
        console.error('Error fetching batch data, status:', response.status);
      }
    }
    return geoData;
  }

  // Fetch geolocation data and download when the button is clicked
  downloadBtn.addEventListener('click', function() {
    logToBackground('Download button clicked');
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

  // Create a map with geolocation data when the map button is clicked
  mapBtn.addEventListener('click', function() {
    logToBackground('Map button clicked');
    chrome.storage.local.get({ips: []}, async function(result) {
      const ips = result.ips || [];
      if (ips.length === 0) {
        alert("No IPs to map.");
        return;
      }

      loadingDiv.style.display = 'block';

      const ipCounts = ips.reduce((acc, ip) => {
        acc[ip] = (acc[ip] || 0) + 1;
        return acc;
      }, {});

      const uniqueIps = Object.keys(ipCounts);
      const geoData = await fetchGeolocationData(uniqueIps);

      geoData.forEach(data => {
        data.count = ipCounts[data.query];
      });
      // Initialize the map in the view
      mapDiv.style.height = "500px"; // Set a fixed height for the map
      let map = L.map('map').setView([20, 0], 2); // Adjust the initial view

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Add markers with click events for each location
      geoData.forEach(data => {
        if (data.lat && data.lon) {
          let marker = L.circle([data.lat, data.lon], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 10000
          }).addTo(map);

          marker.bindPopup(`<b>IP:</b> ${data.query}<br><b>Times Accessed:</b> ${data.count}<br><b>Location:</b> ${data.city}, ${data.country}<br><b>ISP:</b> ${data.isp}<br><b>Org:</b> ${data.org}<br><b>AS:</b> ${data.as}`);
        }
      });

      map.invalidateSize(); // Ensure the map is fully rendered
      loadingDiv.style.display = 'none';
    });
  });
});
