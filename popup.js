document.addEventListener('DOMContentLoaded', function() {
  logToBackground('Popup DOMContentLoaded');
  chrome.storage.local.get({ips: []}, function(result) {
    const ips = result.ips || [];
    loadMapWithGeolocationData(ips);
  });
});

async function fetchGeolocationData(ips) {
  logToBackground('Fetching geolocation data for IPs: ' + JSON.stringify(ips));

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

    let map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

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
    

    let refreshButton = L.Control.extend({
      options: {
        position: 'topleft'
      },

      onAdd: function (map) {
        let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        container.style.backgroundColor = 'white'; 
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.lineHeight = '30px';
        container.style.textAlign = 'center';
        container.style.cursor = 'pointer';
        container.style.fontSize = '18px';

        container.innerHTML = '&#8634;';

        container.onclick = function(){
          chrome.storage.local.get({ips: []}, function(result) {
            loadMapWithGeolocationData(result.ips || []);
          });
        }

        return container;
      }
    });

    let downloadButton = L.Control.extend({
      options: {
        position: 'topleft'
      },

      onAdd: function (map) {
        let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        container.style.backgroundColor = 'white'; 
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.lineHeight = '30px';
        container.style.textAlign = 'center';
        container.style.cursor = 'pointer';
        container.style.fontSize = '18px';

        container.innerHTML = '&#8595;';

        container.onclick = function(){
          chrome.storage.local.get({ips: []}, function(result) {
            const ips = result.ips || [];
            downloadIpGeolocationData(ips);
          });
        }

        return container;
      }
    });

    map.addControl(new refreshButton());
    map.addControl(new downloadButton());
    map.invalidateSize();
  });
}

function downloadIpGeolocationData(ips) {
  if (ips.length === 0) {
    alert("No IPs to download.");
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

    const blob = new Blob([JSON.stringify(geoData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: 'net_mapper_ip_geolocation_data.json',
      saveAs: true
    });

  }).catch(error => {
    console.error('Error fetching geolocation data:', error);
  });
}


function logToBackground(message) {
  chrome.runtime.sendMessage({log: message}, function(response) {
    console.log('Background response:', response);
  });
}