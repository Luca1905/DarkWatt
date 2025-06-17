console.log("popup loaded");

let db;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Toolbar button clicked");
  await initDatabase();
  console.log(db);
  const data = await getLuminanceData();
  if (data) {
    document.getElementById('current-luminance').textContent = `${data.luminance.toFixed(2)} nits`;
  }
});

function initDatabase() {
  return new Promise((resolve, reject) => {
    const DBOpenRequest = window.indexedDB.open('darkWatt-storage', 1);
    DBOpenRequest.onerror = (event) => {
      console.error('Error opening database:', event.target.error);
      reject(event.target.error);
    };
    DBOpenRequest.onsuccess = () => {
      db = DBOpenRequest.result;
      resolve();
    };
    DBOpenRequest.onupgradeneeded = (event) => {
      db = event.target.result;
      const objectStore = db.createObjectStore('darkWatt-storage', {
        keyPath: 'date',
      });
      objectStore.createIndex('date', 'date', { unique: true });
    };
  });
}

function getLuminanceData() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('darkWatt-storage', 'readonly');
    transaction.onerror = (event) => {
      console.error(
        'Error getting luminance data from database:',
        event.target.error
      );
      reject(event.target.error);
    };

    const objectStore = transaction.objectStore('darkWatt-storage');
    const request = objectStore.openCursor(null, 'prev');
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        resolve(cursor.value);
      } else {
        console.log('No data found');
        resolve(null);
      }
    };

    request.onerror = (event) => {
      console.error('Error fetching latest data', event.target.error);
      reject(event.target.error);
    };
  });
}