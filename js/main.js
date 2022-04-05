//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
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
    promises.push(d3.csv("data/QSRanking2020.csv")); //load attributes from csv  
    promises.push(d3.json("data/universities.topojson")); //load points data  
    promises.push(d3.json("data/World_Countries.topojson")); //load background spatial data    
    //promises.push(d3.json("data/states.topojson")); //load choropleth spatial data 
    
    Promise.all(promises).then(callback);
    
    function callback(data){    
        universities = data[0];    
        world = data[1];
        //states = data[2];    
        var allCountries = topojson.feature(world, world.objects.World_Countries);
        //var allStates = topojson.feature(states, states.objects.usa);
        var allUniversities = topojson.feature(universities, universities.objects.collection);
        //add countries to map
        var countries = map.append("path")
            .datum(allCountries)
            .attr("class", "countries")
            .attr("d", path);
        //add usa states to map
        //var usaStates = map.append("path")
            //.datum(allStates)
            //.attr("class", "regions")
            //.attr("d", path);
        //add world top 50 universities to the map
        var worldUniversities = map.append("path")
            .datum(allUniversities)
            .attr("class", "regions")
            .attr("d", path);
    };
};



//execute script when window is loaded
window.onload = function(){
    //SVG dimension variables
    var w = 950, h = 500;
    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg")
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container")
        .style("background-color", "rgba(0,0,0,0.2)");
    var innerRect = container.append("rect") //put a new rect in the svg
        .datum(400)
        .attr("width", function(d){ //rectangle width
            return d * 2; //400 * 2 = 800
        }) //rectangle width
        .attr("height", function(d){ //rectangle height
            return d; //400
        }) //rectangle height
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#FFFFFF"); //fill color
        

    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    

    var x = d3.scaleLinear() //create the scale
        .range([90, 810]) //output min and max
        .domain([0, 3]); //input min and max
        
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });
        
    var y = d3.scaleLinear()
        .range([450, 50])
        .domain([0, 700000]);

    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701"
        ])
        .domain([
            minPop, 
            maxPop
        ]);

    var circles = container.selectAll(".circles") 
        .data(cityPop) 
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("id", function(d){ //circle radius
             return d.city;
        })
        .attr("r", function(d){ //x coordinate
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){ //y coordinate
            return x(i);
        })
        .attr("cy", function(d){
            return y(d.population);
        })
        .style("fill", function(d, i){ //add a fill based on the color scale generator
            return color(d.population);
        })
        .style("stroke", "#000");

    
    var yAxis = d3.axisLeft(y);
    
    //create axis g element and add axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);
    
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.population) + 5;
        })
    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });


    var format = d3.format(",");

    //second line of label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "19") //vertical offset
        .text(function(d){
            return "Pop. " + format(d.population); //use format generator to format numbers
        });
};