export function getStorageData(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error("Error reading data from chrome.storage.local:", error);
        reject(error);
      } else {
        resolve(result[key] || {});
      }
    });
  });
}

export function setStorageData(key, data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: data }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error("Error writing data to chrome.storage.local:", error);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
