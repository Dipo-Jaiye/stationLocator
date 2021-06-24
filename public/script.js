          /* This will let you use the .remove() function later on */
if (!('remove' in Element.prototype)) {
  Element.prototype.remove = function() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  };
}

fetch("/stations")
.then((response) =>{
  return response.json();
})
.then(data =>{

  function addMarkers(stations) {
    /* For each feature in the GeoJSON object above: */
    stations.features.forEach(function(marker) {
      /* Create a div element for the marker. */
      var el = document.createElement('div');
      /* Assign a unique `id` to the marker. */
      el.id = "marker-" + marker.properties.id;
      /* Assign the `marker` class to each marker for styling. */
      el.className = 'marker';
      
      /**
       * Create a marker using the div element
       * defined above and add it to the map.
      **/
      new mapboxgl.Marker(el, { offset: [0, -23] })
        .setLngLat(marker.geometry.coordinates)
        .addTo(map);
  
      el.addEventListener('click', function(e){
        /* Fly to the point */
        flyToStation(marker);
        /* Close all other popups and display popup for clicked station */
        createPopUp(marker);
        /* Highlight listing in sidebar */
        var activeItem = document.getElementsByClassName('active');
        e.stopPropagation();
        if (activeItem[0]) {
          activeItem[0].classList.remove('active');
        }
        var listing = document.getElementById('listing-' + marker.properties.id);
        listing.classList.add('active');
      });
    });
  }
  
  function buildLocationList(data,pointGeometry=null) {
    data.features.forEach(function(station, i){
      /**
       * Create a shortcut for `station.properties`,
       * which will be used several times below.
      **/
      var prop = station.properties;
  
      /* Add a new listing section to the sidebar. */
      var listings = document.getElementById('listings');
      var listing = listings.appendChild(document.createElement('div'));
      /* Assign a unique `id` to the listing. */
      listing.id = "listing-" + data.features[i].properties.id;
      /* Assign the `item` class to each listing for styling. */
      listing.className = 'item';
  
      /* Add the link to the individual listing created above. */
      var link = listing.appendChild(document.createElement('a'));
      link.href = '#';
      link.className = 'title';
      link.id = "link-" + prop.id;
      link.innerHTML = prop.ward_name;
  
      /* Add details to the individual listing. */
      var details = listing.appendChild(document.createElement('div'));
      details.innerHTML = prop.lga_name;
      if (prop.state_code) {
        details.innerHTML += ' · ' + prop.state_code;
      }
      if (prop.distance) {
        var roundedDistance = Math.round(prop.distance * 100) / 100;
        details.innerHTML +=
          '<p><strong>' + roundedDistance + ' km away</strong></p>';
      }
  
      link.addEventListener('click', function(e){
    for (var i = 0; i < data.features.length; i++) {
      if (this.id === "link-" + data.features[i].properties.id) {
        var clickedListing = data.features[i];
        if(!this.parentNode.classList.contains("active")){
          flyToStation(clickedListing);
          createPopUp(clickedListing);
          var activeItem = document.getElementsByClassName('active');
          if (activeItem[0]) {
            activeItem[0].classList.remove('active');
          }
          this.parentNode.classList.add('active');
          if(clickedListing.properties.distance){
            var bbox = getBbox(data, i, pointGeometry);
            map.fitBounds(bbox, {
              padding: 100
            });
          }
          

      createPopUp(stations.features[0]);
        } else{
          backToCenter();
          this.parentNode.classList.remove('active');
        }
        
        
      }
    }  
    
  });
    });
  }
  
  function flyToStation(currentFeature) {
    map.flyTo({
      center: currentFeature.geometry.coordinates,
      zoom: 15
    });
  }
  
  function createPopUp(currentFeature) {
    var popUps = document.getElementsByClassName('mapboxgl-popup');
    /** Check if there is already a popup on the map and if so, remove it */
    if (popUps[0]) popUps[0].remove();
  
    var popup = new mapboxgl.Popup({ closeOnClick: false })
      .setLngLat(currentFeature.geometry.coordinates)
      .setHTML('<h3>' + currentFeature.properties.ward_name + '</h3>' +
        '<h4>' + currentFeature.properties.state_name + '</h4>')
      .addTo(map);
  }
  
  function getBbox(sortedStations, stationIdentifier, searchResult) {
    var lats = [
      sortedStations.features[stationIdentifier].geometry.coordinates[1],
      searchResult.coordinates[1]
    ];
    var lons = [
      sortedStations.features[stationIdentifier].geometry.coordinates[0],
      searchResult.coordinates[0]
    ];
    var sortedLons = lons.sort(function(a,b) {
        if (a > b) { return 1; }
        if (a.distance < b.distance) { return -1; }
        return 0;
      });
    var sortedLats = lats.sort(function(a,b) {
        if (a > b) { return 1; }
        if (a.distance < b.distance) { return -1; }
        return 0;
      });
    return [
      [sortedLons[0], sortedLats[0]],
      [sortedLons[1], sortedLats[1]]
    ];
  };

  function howCloseToStation(pointGeometry) {
    fetch("/lsort",{
      method:"POST",
      headers: {
        'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:JSON.stringify({
        result:pointGeometry
      })
    })
    .then(response=>response.json())
    .then(stations => {
      stations.features.forEach(function(station, i){
        station.properties.id = i;
      });
       // Code for the next step will go here
      var listings = document.getElementById('listings');
      while (listings.firstChild) {
        listings.removeChild(listings.firstChild);
      }
      buildLocationList(stations,pointGeometry);

      var activeListing = document.getElementById('listing-' + stations.features[0].properties.id);
      activeListing.classList.add('active');

      var bbox = getBbox(stations, 0, pointGeometry);
      map.fitBounds(bbox, {
        padding: 100
      });

      createPopUp(stations.features[0]);
    });
  }

  function backToCenter() {
    map.flyTo({
        center:[7.491302,9.072264],
        zoom:5
    })
  }

  mapboxgl.accessToken = data.accessToken;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [7.491302,9.072264],
    zoom: 5,
    scrollZoom: true
  });
  
  const geojson = {
    'type': 'FeatureCollection',
    'features': []
    };
  
  const stations = data.stations;
  /* Assign a unique ID to each station */
stations.features.forEach(function(station, i){
  station.properties.id = i;
});

  map.on('load', function (e) {
  
 
    map.addSource('places', {
      type: 'geojson',
      data: stations
    });
  
    map.addSource('geojson',{
      type:'geojson',
      data: geojson
    });
  
    map.addLayer({
      id: 'measure-points',
      type: 'circle',
      source: 'geojson',
      paint: {
      'circle-radius':8,
      'circle-color':"white",
      'circle-stroke-color':"blue",
      'circle-stroke-width':2
      },
      filter: ['in', '$type', 'Point']
      });
  
    var geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken, // Set the access token
      mapboxgl: mapboxgl, // Set the mapbox-gl instance
      marker: true, // Use the geocoder's default marker style
      bbox: [2.719479364000051, 4.545376667000028, 14.710931, 13.624633] // Set the bounding box 
    });
    
    map.addControl(geocoder, 'top-left');
  
    geocoder.on('result', function(ev) {
      var searchResult = ev.result.geometry;
      // Code for the next step will go here
      //var options = { units: 'kilometres' };
      howCloseToStation(searchResult);
    });
  
    addMarkers(stations);
  
    buildLocationList(stations);
  
    map.on('mousemove', function (e) {
      var features = map.queryRenderedFeatures(e.point, {
        layers: ['measure-points']
        });
      map.getCanvas().style.cursor = features.length
  ? 'pointer'
  : 'crosshair';
      });
  
      map.on('click', function (e) {
        var features = map.queryRenderedFeatures(e.point, {
        layers: ['measure-points']
        });
         
         
        // If a feature was clicked, remove it from the map
        if (features.length) {
          geojson.features.pop();
          var listings = document.getElementById('listings');
          while (listings.firstChild) {
            listings.removeChild(listings.firstChild);
          }
          buildLocationList(stations);
          backToCenter();
        } else {
        var point = {
        'type': 'Feature',
        'geometry': {
        'type': 'Point',
        'coordinates': [e.lngLat.lng, e.lngLat.lat]
        },
        'properties': {
        'id': String(new Date().getTime())
        }
        };
         
        geojson.features[0] = point;
        howCloseToStation(point.geometry);
        }
         
         
        map.getSource('geojson').setData(geojson);
        
        });
  });
})