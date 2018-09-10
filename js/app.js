/**
* ViewModel class
*/
var ViewModel = function() {
  var self = this;

  // The Sidebar Menu: user can open or close the menu
  this.showSideMenu = ko.observable(true);
  this.openOrCloseMenu = function () {
    this.showSideMenu(!this.showSideMenu());
  }.bind(this);

/**
* location class, holds all the location information
*/
  var Information = function(data) {
    this.title = data.title;
    this.category = data.category;
    this.marker = data.marker;
    this.isVisible = ko.observable(true);
  };

  self.companyList = ko.observableArray([]);


  // Push all locationsData to an array - companyList

  locationsData.forEach(function(locationItem) {
    self.companyList.push(new Information(locationItem));
  });

  // All the categories 
  self.categoryOptions = ['All', 'Financial', 'Biotechnology', 'Electronics'];
  self.selectedCategory = ko.observable(self.categoryOptions[0]);

  // filter locationsData based on the selected category

  self.filterItems = ko.computed(function() {
    var listItem = self.companyList();
    var selectedCategory = self.selectedCategory();
    for (var i = 0; i < listItem.length; i++) {
      if (selectedCategory === self.categoryOptions[0]) {
        listItem[i].isVisible(true);
        if (marker) {
          listItem[i].marker.setVisible(true);
        }
      } else if (selectedCategory !== listItem[i].category) {
        listItem[i].isVisible(false);
        listItem[i].marker.setVisible(false);
      } else {
        listItem[i].isVisible(true);
        listItem[i].marker.setVisible(true);
      }
    }
  });

  // change the current location when user clicks on a different location
  self.changeLocation = function(place) {
    google.maps.event.trigger(place.marker, 'click');
  };
};
// Store ViewModel in viewModel variable for instantiation in map.js
var viewModel = new ViewModel();

// GOOGLE MAPS
// Use JavaScript API to initialize map, markers and info windows
// Set these variables as global for use in other parts of app
var map;
var marker;
var markers = [];


// Initialize function from callback
function initMap() {
  // Constructor creates a new map
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: 37.817845, lng: -122.337354
    },
    zoom: 9,
    mapTypeControl: false
  });

 // Create the infowindow
  var infoWindow = new google.maps.InfoWindow();
  var bounds = new google.maps.LatLngBounds();

  // Add markers from locationsData listed in model - var locationsData
  for (i = 0; i < locationsData.length; i++) {
    var position = locationsData[i].location;
    var title = locationsData[i].title;

    marker = new google.maps.Marker({
      map: map,
      position: position,
      title: title,
      animation: google.maps.Animation.DROP,
    });
    bounds.extend(marker.position);
    viewModel.companyList()[i].marker = marker;


    // Open info window and change marker when click the location
    marker.addListener('click', function() {
      bounceAnimation(this);
      map.panTo(marker.getPosition());
      populateInfoWindow(this, infoWindow);
    });

    //make the animation and set a time for it
    function bounceAnimation(marker) {
      marker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(function() {
        marker.setAnimation(null)
      }, 1500);
    }

    // Populates the infowindow when the marker is clicked
    function populateInfoWindow(marker, infowindow) {

      var wikiAPIUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&imlimit=5&format=json&callback=wikiCallback';
      var wikiContent = null;
      // Wikipedia AJAX Request to add Wikipedia description to info window
      var request = $.ajax({
        url: wikiAPIUrl,
        dataType: "jsonp"
      });
      var streetViewService = new google.maps.StreetViewService();
      var radius = 50;
      
      function getStreetView(data, status) {
        var wikiContent = null;
        if (status == google.maps.StreetViewStatus.OK) {
          var nearStreetViewLocation = data.location.latLng;
          var heading = google.maps.geometry.spherical.computeHeading(
            nearStreetViewLocation, marker.position);
          var panoramaOptions = {
            position: nearStreetViewLocation,
            pov: {
              heading: heading,
              pitch: 30
            }
          };
          request.done(function(response) {
            
            var article = response[1][0];
            var snippet = response[2][0];
            var wikiurl = 'http://en.wikipedia.org/wiki/' + article;
            wikiContent = '<div class = "infoWindow"><a class = "infoHeader" href="' 
              + wikiurl + '">' + marker.title + '</a><p>' + snippet 
              + '</p><span> Source: </span><a href="' + wikiurl + '">' + article 
              +'</a>' ;
            
            if (article === undefined) {
              alert("wikipedia articles not found");
            }
            //create streetview tag and merge it with wiki
            var content = wikiContent + '<div id="pano"></div></div>';
            infoWindow.setContent(content);
            
            var panorama = new google.maps.StreetViewPanorama(
              document.getElementById('pano'), panoramaOptions);
            //reset the height
            document.getElementById('pano').style.height = "inherit";
          }).fail(function(){
              var content = '<div class = "infoWindow">No wikipedia entries has found.<div id="pano"></div></div>';
              infoWindow.setContent(content);
              
              var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
              //reset the height
              document.getElementById('pano').style.height = "inherit";
          });
        } 
        else {

          request.done(function(response){
            var article = response[1][0];
            var snippet = response[2][0];
            var wikiurl = 'http://en.wikipedia.org/wiki/' + article;
            wikiContent = '<div class = "infoWindow"><a class = "infoHeader" href="' 
              + wikiurl + '">' + marker.title + '</a><p>' + snippet 
              + '</p><span> Source: </span><a href="' + wikiurl + '">' + article 
              +'</a>' ;
            
            if (article === undefined) {
              alert("wikipedia articles not found");
            }
            //create streetview tag and merge it with wiki
            var content = wikiContent + '<div id="pano">No Street View Found</div></div>';
            infoWindow.setContent(content);
            //reset the height
            document.getElementById('pano').style.height = "auto"
          }).fail(function(){
            wikiContent = '<div class = "infoWindow">No wikipedia entries has found.' ;
            var content = wikiContent + '<div id="pano">No Street View Found</div></div>';
            infoWindow.setContent(content);
            //reset the height
           document.getElementById('pano').style.height = "auto"
          });
        }
      }
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        infoWindow.open(this.map, marker);
    }
    map.fitBounds(bounds);
  }

  // Apply Knockout.js bindings
  ko.applyBindings(viewModel);
}
// Google Maps API error handler
function mapError(){
  alert ("Google Maps failed to load. Please try again later.");
}
