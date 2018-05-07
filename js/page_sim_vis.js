var dcon;
var svgcon;
var $con;

var scw = 0;
var sch = 0;
var schw = 0;
var schh = 0;

function initvis() {
    dcon = d3.select("#viscontainer");
    $con = $("#viscontainer")
    scw = 2 * Math.floor($con.width() / 2); //floor to nearest even number
    sch = 2 * Math.floor($con.height() / 2);
    schw = 0.5 * scw;
    schh = 0.5 * sch;
    svgcon = dcon.append("svg").attr("width", scw).attr("height", sch);
    buildGPU();
}

var d_cus = [];

function buildGPU() {
    d_cus = [];
    svgcon.append("rect")
        .attr("x", schw - 50)
        .attr("y", 0)
        .attr("width", 100)
        .attr("height", 100);

    let bestfit = {dif: 1000, g: cus}
    const aspect = scw / (sch - 120);
    for (let g = cus; g > 0; g--) {
        const colls = g;
        const rows = Math.ceil(cus / colls);
        let newaspect = colls / rows;
        let dif = Math.abs(aspect - newaspect);
        if (dif < bestfit.dif) {
            bestfit.dif = dif;
            bestfit.g = g;
        }
    }
    console.log(bestfit);
    const colls = bestfit.g;
    const rows = Math.ceil(cus / colls);
    let cudim = Math.min(scw / (colls), (sch - 120) / (rows));
    let gap = cudim;
    cudim -= 10;

    for (let i = 0; i < cus; i++) {
        let g = svgcon.append("g")
            .attr("transform",
                "translate(" +
                (gap * (i % colls)) + "," +
                (110 + gap * (Math.floor(i / colls))) + ")")
            .classed("computeUnit", true);
        g.append("rect")
            .attr("width", cudim)
            .attr("height", cudim);

        g.append("text")
            .attr("x", cudim / 2)
            .attr("y", cudim / 2)
            .attr("dy", ".35em") //todo find out what this is
            .append('tspan').text("CU:"+i).attr('dy', '.9em');
        d_cus.push(g);
    }
}

function updateGPUVis(){
    svgcon.selectAll(".computeUnit").classed("used", function(d, i) { return i < usedCUs; });
    svgcon.selectAll(".used > text").append('tspan')
        .attr('dy', '.9em').text(function(d, i) {return (occupancy[i]*100) });

}