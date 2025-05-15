const map = L.map('map').setView([  23.16000000, 79.95000000  ],13); // Global view
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.marker([23.16000000, 79.95000000 ]).addTo(map)
    .bindPopup('you are here.')
    .openPopup();
    // 2. Function to search and move the map
  function searchPlace() {
    const query = document.getElementById('search').value;
    const apiKey = 'd4299a6335944167afd2fcbae5d7ac76'; // Replace this

    fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        if (data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry;

          // Move the map to the location
          map.setView([lat, lng],13);

          // Remove previous marker
          if (currentMarker) {
            map.removeLayer(currentMarker);
          }

          // Add marker at the new location
          currentMarker = L.marker([lat,lng],13).addTo(map)
            .bindPopup(data.results[0].formatted)
            .openPopup();
        } else {
          alert("Place not found.");
        }
      });
  }