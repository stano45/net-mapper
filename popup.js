import { fetchBatchData } from "./api.js";
import { getStorageData, setStorageData } from "./utils.js";

document.addEventListener("DOMContentLoaded", async function () {
  const ips = await getStorageData("ips");
  initializeMap(ips);
});

async function fetchGeolocationData(ipsMap) {
  let cachedData = await getStorageData("geoDataCache");

  const geoData = [];
  const ipsToFetch = Object.keys(ipsMap).filter((ip) => !cachedData[ip]);

  const batches = [];
  const batchSize = 100;
  for (let i = 0; i < ipsToFetch.length; i += batchSize) {
    batches.push(ipsToFetch.slice(i, i + batchSize));
  }

  for (let batch of batches) {
    const batchData = await fetchBatchData(batch);
    if (batchData) {
      geoData.push(...batchData);
      batchData.forEach((item) => {
        if (item.status === "success") {
          cachedData[item.query] = item;
          cachedData[item.query].count = ipsMap[item.query];
        }
      });
    }
  }

  await setStorageData("geoDataCache", cachedData);

  Object.keys(ipsMap).forEach((ip) => {
    if (cachedData[ip]) {
      geoData.push(cachedData[ip]);
    }
  });

  return geoData;
}

let markerLayer;

function initializeMap(ipsMap) {
  if (Object.keys(ipsMap).length === 0) {
    return;
  }

  let map = L.map("map").setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  void fetchAndMarkGeolocationData(ipsMap, map);
  setInterval(async () => {
    const ips = await getStorageData("ips");
    void fetchAndMarkGeolocationData(ips, map);
  }, 5000);

  let CustomZoomControl = L.Control.Zoom.extend({
    onAdd: function (map) {
      let container = L.DomUtil.create(
        "div",
        "leaflet-control-zoom leaflet-bar leaflet-control"
      );

      this._zoomInButton = this._createButton(
        "&#10133;",
        "Zoom in",
        "leaflet-control-zoom-in custom-zoom-in",
        container,
        this._zoomIn.bind(this)
      );
      this._zoomOutButton = this._createButton(
        "&#10134;",
        "Zoom out",
        "leaflet-control-zoom-out custom-zoom-out",
        container,
        this._zoomOut.bind(this)
      );

      this._updateDisabled();
      map.on("zoomend zoomlevelschange", this._updateDisabled, this);

      return container;
    },
    _createButton: function (html, title, className, container, fn) {
      let link = L.DomUtil.create("a", className, container);
      link.innerHTML = html;
      link.href = "#";
      link.title = title;

      L.DomEvent.on(link, "click", L.DomEvent.stopPropagation)
        .on(link, "click", L.DomEvent.preventDefault)
        .on(link, "click", fn, this);

      return link;
    },
  });

  
let RefreshButton = L.Control.extend({
  options: {
    position: "topleft",
  },
  onAdd: function (map) {
    return createControlButton(
      "&#128260;",
      "Refresh the map data",
      async function () {
        const ips = await getStorageData("ips");
        void fetchAndMarkGeolocationData(ips, map);
      }
    );
  },
});

let DownloadButton = L.Control.extend({
  options: {
    position: "topleft",
  },
  onAdd: function (map) {
    return createControlButton(
      "&#11015;&#65039;",
      "Download IP geolocation data",
      async function () {
        const ips = await getStorageData("ips");
        void downloadIpGeolocationData(ipsMap);
      }
    );
  },
});

let ClearDataControl = L.Control.extend({
  options: {
    position: "topleft",
  },
  onAdd: function (map) {
    return createControlButton(
      "&#10060;",
      "Clear all data",
      function () {
        clearLocalStorageData(map);
      }
    );
  },
});

let AboutControl = L.Control.extend({
  options: {
    position: "topleft",
  },
  onAdd: function (map) {
    return createControlButton(
      "&#8505;&#65039;",
      "About author",
      function () {
        window.open("https://kosorin.com", "_blank");
      }
    );
  },
});

  map.zoomControl.remove();
  map.addControl(new CustomZoomControl());
  map.addControl(new RefreshButton());
  map.addControl(new DownloadButton());
  map.addControl(new ClearDataControl());
  map.addControl(new AboutControl());

  map.invalidateSize();
}

function createControlButton(iconHtml, title, onClick) {
  let container = L.DomUtil.create(
    "div",
    "leaflet-bar leaflet-control leaflet-control-custom"
  );

  container.style.backgroundColor = "white";
  container.style.width = "30px";
  container.style.height = "30px";
  container.style.lineHeight = "30px";
  container.style.textAlign = "center";
  container.style.cursor = "pointer";
  container.style.fontSize = "18px";
  container.innerHTML = iconHtml;
  container.title = title;
  container.onclick = onClick;

  return container;
}

async function fetchAndMarkGeolocationData(ipsMap, map) {
  if (markerLayer) {
    markerLayer.clearLayers();
  } else {
    markerLayer = L.layerGroup().addTo(map);
  }

  const geoData = await fetchGeolocationData(ipsMap);
  geoData.forEach((data) => {
    if (data.lat && data.lon) {
      let marker = L.circle([data.lat, data.lon], {
        color: "red",
        fillColor: "#f03",
        fillOpacity: 0.5,
        radius: 2000,
      }).bindPopup(
        `<b>IP:</b> ${data.query}<br>
          <b>Times Accessed:</b> ${data.count}<br>
          <b>Location:</b> ${data.city}, ${data.country}<br>
          <b>ISP:</b> ${data.isp}<br>
          <b>Org:</b> ${data.org}<br>
          <b>AS:</b> ${data.as}`
      );

      marker.addTo(markerLayer);
    }
  });
}

async function downloadIpGeolocationData(ipsMap) {
  if (Object.keys(ipsMap).length === 0) {
    return;
  }

  const geoData = await fetchGeolocationData(ipsMap);
  geoData.forEach((data) => {
    data.count = ipsMap[data.query];
  });
  const blob = new Blob([JSON.stringify(geoData, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: "net_mapper_ip_geolocation_data.json",
    saveAs: true,
  });
}

function clearLocalStorageData() {
  chrome.storage.local.remove(["geoDataCache", "ips"], () => {
    if (chrome.runtime.lastError) {
      console.error("Error clearing local storage:", chrome.runtime.lastError);
    } else {
      console.log("Local storage cleared.");
      if (markerLayer) {
        markerLayer.clearLayers();
      }
    }
  });
}
