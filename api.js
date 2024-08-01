export async function fetchBatchData(batch) {
  const data = JSON.stringify(batch);
  const baseUrl = "http://ip-api.com/batch";
  const queryParams = [
    "status",
    "message",
    "country",
    "city",
    "zip",
    "lat",
    "lon",
    "isp",
    "org",
    "proxy",
    "hosting",
    "query",
  ].join(",");
  const url = `${baseUrl}?fields=${queryParams}`;

  const options = {
    method: "POST",
    body: data,
    headers: {
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error("Error fetching batch data, status:", response.status);
      return null;
    }

    const batchData = await response.json();
    return batchData;
  } catch (error) {
    console.error("Network error while fetching batch data:", error);
    return null;
  }
}
