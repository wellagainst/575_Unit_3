(function(){

    //variables for data join
    var attrArray = ["UniversityCount", "AverageAnnualCost", "AverageNetPrice", "AverageGrantAid", "AverageAlumniSalary"];
    var expressed = attrArray[0];

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 460;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on USA
        var projection = d3.geoAlbers()
            .center([0, 37.24])
            .rotate([97.36, 0, 0])
            .parallels([29.5, 45.5])
            .scale(500.00)
            .translate([width/2, height/2]);
        var path = d3.geoPath()
            .projection(projection);
        //use Promise.all to parallelize asynchronous data loading
        var promises = [];    
        promises.push(d3.csv("data/USUniversitybyState.csv")); //load attributes from csv  
        promises.push(d3.json("data/World_Countries.topojson")); //load background spatial data    
        promises.push(d3.json("data/states.topojson")); //load choropleth spatial data 
        
        Promise.all(promises).then(callback);
        
        function callback(data){    
            var universities = data[0],    
                world = data[1],
                states = data[2];    
            var allCountries = topojson.feature(world, world.objects.World_Countries),
                allStates = topojson.feature(states, states.objects.usa).features;
            
            //add countries to map
            var countries = map.append("path")
                .datum(allCountries)
                .attr("class", "countries")
                .attr("d", path);
            
            var colorScale = makeColorScale(universities);

            //join csv data to GeoJSON enumeration units
            allStates = joinData(allStates, universities);
            //add enumeration units to the map
            setEnumerationUnits(allStates, map, path, colorScale);
            
            //add coordinated visualization to the map
            setChart(universities, colorScale);

            //add drop-down menu
            createDropdown(universities);

            //add change attribute to the drop down menu
            //changeAttribute(attribute, universities);
        };
    };

    function joinData(allStates, universities){
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<universities.length; i++){
            var csvRegion = universities[i]; //the current region
            var csvKey = csvRegion.STATE_NAME; //the CSV primary key
            
            //loop through geojson regions to find correct region
            for (var j=0; j<allStates.length; j++){
                var geojsonProps = allStates[j].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.STATE_NAME; //the geojson primary key
                
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };

        return allStates;
    };

    function setEnumerationUnits(allStates, map, path, colorScale){
        //add usa states to map
        var usaStates = map.selectAll(".regions")
            .data(allStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions" + d.properties.STATE_NAME;
            })
            .attr("d", path)
            .style("fill", function(d){
                return colorScale(d.properties[expressed]);
            });

        
    };

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var a=0; a<data.length; a++){
            var val = parseFloat(data[a][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    //function to create coordinated bar chart
    function setChart(universities, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 460;

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, 105]);

        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(universities)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.UniversityCount;
            })
            .attr("width", chartWidth / universities.length - 1)
            .attr("x", function(d, i){
                return i * (chartWidth / universities.length);
            })
            .attr("height", function(d){
                return yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });

        //annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(universities)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.UniversityCount;
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / universities.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
            });
        
        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Universities in each state");
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(universities){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, universities)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change event handler
    function changeAttribute(attribute, universities) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(universities);

        //recolor enumeration units
        var regions = d3.selectAll(".regions").style("fill", function (d) {
            var value = d.properties[expressed];
            if (value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
        });
    }

})();