(function(){

    //variables for data join
    var attrArray = ["UniversityCount", "AverageAnnualCost(k)", "AverageNetPrice(k)", "AverageGrantAid(k)", "AverageAlumniSalary(k)"];
    var expressed = attrArray[0];

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.46,
        chartHeight = 460,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear().range([455, 0]).domain([0, 120]);
    
    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.48,
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
                return "regions " + d.properties.STATE_NAME;
            })
            .attr("d", path)
            .style("fill", function(d){
                return colorScale(d.properties[expressed]);
            })
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight();
            })
            .on("mousemove", moveLabel);

        
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

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //set bars for each state
        var bars = chart.selectAll(".bar")
            .data(universities)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.UniversityCount;
            })
            .attr("width", chartInnerWidth / universities.length - 1)
            .on("mouseover", function(event, d){
                highlight(d)
            })
            .on("mouseout", function(event, d){
                dehighlight();
            })
            .on("mousemove", moveLabel);
        
        var chartTitle = chart.append("text")
            .attr("x", 210)
            .attr("y", 30)
            .attr("class", "chartTitle");

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        
        //set bar positions, heights, and colors
        updateChart(bars, universities.length, colorScale);
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
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
        });

        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition()
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);
        

        updateChart(bars, universities.length, colorScale);
    }; 

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 460 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }    
            });
        
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " in each State");
    };

    //function to highlight enumeration units and bars
    function highlight(props){
        
        var selected = d3.selectAll("." + props.STATE_NAME)
            .style("stroke", "blue")
            .style("stroke-width", "2");
        
        setLabel(props)
    };

    //function to dehighlight enumeration units and bars
    function dehighlight(){
        
        var regions = d3.selectAll(".regions")
            .style("stroke", "black")
            .style("stroke-width", "0.5");

        var regions = d3.selectAll(".bar")
            .style("stroke", "none")
            .style("stroke-width", "0");
        d3.select(".infolabel")
            .remove();
    };
    

    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.STATE_NAME + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };

    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1; 
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
})();