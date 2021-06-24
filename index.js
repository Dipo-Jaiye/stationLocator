const express = require("express");
const turfDistance = require("@turf/distance").default;
const clone = require("rfdc")();
const fs = require("fs");
require("dotenv").config();
const {MY_ACCESS_TOKEN, PORT} = process.env;

app = express();
app.use(express.static("public"));
app.use(express.json());

app.set("view engine", "ejs");

app.get("/stations",(req,res)=>{
    fs.readFile("./public/Electricity_Substations.geojson",(err,data)=>{
        if (err) console.log(err);
        const stations = JSON.parse(data);
        res.json({accessToken:MY_ACCESS_TOKEN, stations});
    });
});

app.post("/lsort",(req,res)=>{
    const searchResultGeometry = req.body.result;

    fs.readFile("./public/Electricity_Substations.geojson",(err,data)=>{
        if (err) console.log(err);
        const stations = JSON.parse(data);
        const stationCopy = clone(stations);

    stationCopy.features.forEach(function(station) {
        Object.defineProperty(station.properties, 'distance', {
          value: turfDistance(searchResultGeometry, station.geometry),
          writable: true,
          enumerable: true,
          configurable: true
        });
      });
      
      // Code for the next step will go here
      stationCopy.features.sort(function(a, b) {
        if (a.properties.distance > b.properties.distance) {
          return 1;
        }
        if (a.properties.distance < b.properties.distance) {
          return -1;
        }
        return 0; // a must be equal to b
      });

    res.json(stationCopy);
    });
    
});

app.get("/", (req, res) => {
    res.render("index");
});


app.listen(PORT, () => console.log(`App listening on port 4500. http://localhost:${PORT}/`));