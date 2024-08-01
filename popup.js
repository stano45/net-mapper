document.addEventListener('DOMContentLoaded', function() {
  logToBackground('Popup DOMContentLoaded');

  let downloadBtn = document.getElementById('download-btn');
  let loadingDiv = document.getElementById('loading');

  // Load IP addresses and display them
  chrome.storage.local.get({ips: []}, function(result) {
    const ips = result.ips || [];
    loadingDiv.style.display = 'block';
    loadMapWithGeolocationData(ips);
    loadingDiv.style.display = 'none';
  });

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
});

async function fetchGeolocationData(ips) {
  logToBackground('Fetching geolocation data for IPs: ' + JSON.stringify(ips));

  // Retrieve cached geolocation data from chrome.storage.local
  let cachedData = {};
  try {
    cachedData = await new Promise((resolve, reject) => {
      chrome.storage.local.get('geoDataCache', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.geoDataCache || {});
        }
      });
    });
  } catch (error) {
    logToBackground('Error accessing chrome.storage.local: ' + error.message);
    console.error('Error accessing chrome.storage.local:', error);
  }
  logToBackground("cachedData: " + JSON.stringify(cachedData));

  const geoData = [];
  const ipsToFetch = ips.filter(ip => !cachedData[ip]);
  logToBackground('IPs to fetch: ' + JSON.stringify(ipsToFetch));

  if (ipsToFetch.length > 0) {
    const batches = [];
    const batchSize = 100;
    for (let i = 0; i < ipsToFetch.length; i += batchSize) {
      batches.push(ipsToFetch.slice(i, i + batchSize));
    }

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

        // Update cached data with new batch data
        batchData.forEach(item => {
          if (item.status === 'success') {
            cachedData[item.query] = item;
          }
        });
      } else {
        logToBackground('Error fetching batch data, status: ' + response.status);
        console.error('Error fetching batch data, status:', response.status);
      }
    }


    // Store updated cache in chrome.storage.local
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ geoDataCache: cachedData }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      logToBackground('Error saving to chrome.storage.local: ' + error.message);
      console.error('Error saving to chrome.storage.local:', error);
    }
  } else {
    logToBackground('No new IPs to fetch');
  }

  // Combine cached data with newly fetched data
  ips.forEach(ip => {
    if (cachedData[ip]) {
      geoData.push(cachedData[ip]);
    }
  });

  return geoData;
}


function loadMapWithGeolocationData(ips) {
  if (ips.length === 0) {
    logToBackground('No IPs to map');
    alert("No IPs to map.");
    return;
  }


  const ipCounts = ips.reduce((acc, ip) => {
    acc[ip] = (acc[ip] || 0) + 1;
    return acc;
  }, {});

  const uniqueIps = Object.keys(ipCounts);
  fetchGeolocationData(uniqueIps).then(geoData => {
    geoData.forEach(data => {
      data.count = ipCounts[data.query];
    });

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

    // Add custom button to map
    let customButton = L.Control.extend({
      options: {
        position: 'topleft' // 'topleft', 'topright', 'bottomleft', 'bottomright'
      },

      onAdd: function (map) {
        // Create a container for the button
        let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        // Set styles for the button
        container.style.backgroundColor = 'white'; 
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.lineHeight = '30px';
        container.style.textAlign = 'center';
        container.style.cursor = 'pointer';
        container.style.fontSize = '18px';

        // Set the button content
        container.innerHTML = '&#8634;'; // Example icon (Power symbol)

        // Add a click event listener
        container.onclick = function(){
          chrome.storage.local.get({ips: []}, function(result) {
            loadMapWithGeolocationData(result.ips || []);
          });
        }

        return container;
      }
    });

    // Add the custom button to the map
    map.addControl(new customButton());


    map.invalidateSize();
  });
}

function logToBackground(message) {
  chrome.runtime.sendMessage({log: message}, function(response) {
    console.log('Background response:', response);
  });
}