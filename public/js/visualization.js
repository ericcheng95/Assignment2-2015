var margin = { top: 20, right: 20, bottom: 100, left: 40 };
var width = 960 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;

//define scale of x to be from 0 to width of SVG, with .1 padding in between
var scaleX = d3.scale.ordinal()
  .rangeRoundBands([0, width], .1);

//define scale of y to be from the height of SVG to 0
var scaleY = d3.scale.linear()
  .range([height, 0]);

//define axes
var xAxis = d3.svg.axis()
  .scale(scaleX)
  .orient("bottom");

var yAxis = d3.svg.axis()
  .scale(scaleY)
  .orient("left");

//create svg
var svg = d3.select("body").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//get json object which contains media counts
d3.json('/igMediaCounts', function (error, data) {

    //set domain of x to be all the usernames contained in the data
    scaleX.domain(data.users.map(function (d) { return d.username; }));
    //set domain of y to be from 0 to the maximum media count returned
    scaleY.domain([0, d3.max(data.users, function (d) { return d.counts.media; })]);

    //set up x axis
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")") //move x-axis to the bottom
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", function (d) {
          return "rotate(-65)"
      });

    //set up y axis
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Number of Photos");

    //set up bars in bar graph
    svg.selectAll(".bar")
      .data(data.users)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function (d) { return scaleX(d.username); })
      .attr("width", scaleX.rangeBand())
      .attr("y", function (d) { return scaleY(d.counts.media); })
      .attr("height", function (d) { return height - scaleY(d.counts.media); })
      //.attr("hover", function(d) {return })
      //.text("TEST")
      .on('mouseover', function (d) {
          d3.select(this).style({ opacity: '1.0', })
          d3.select(this).select("text")
          d3.select(this).select("text").style({ opacity: '1.0' });
      })
      .on('mouseout', function (d) {
          d3.select(this).style({ opacity: '1.0' })
          d3.select(this).select("text").style({ opacity: '0.0' });
      });

});

// The Sorting Button
// Has the codefor the button to sort the data
function sortData() {
    //get json object which contains media counts
    d3.json('/igMediaCounts', function (error, data) {

        // Sorting algorithm
        data.users.sort(function (a, b) {
            return (a.counts.media - b.counts.media);
        });

        //set domain of x to be all the usernames contained in the data
        scaleX.domain(data.users.map(function (d) { return d.username; }));
        //set domain of y to be from 0 to the maximum media count returned
        scaleY.domain([0, d3.max(data.users, function (d) { return d.counts.media; })]);

        // Select the section we want to apply our changes to
        var svg = d3.select("body").transition();

        // Make the changes
        svg.select(".x.axis") // change the x axis
            .duration(750)
            .call(xAxis);
        svg.select(".y.axis") // change the y axis
            .duration(750)
            .call(yAxis);

        //set up bars in bar graph (Where the problem lies)
        svg.select(".bar")
          .duration(750)
          .call(scaleX)
          .call(scaleY);

    });

}
