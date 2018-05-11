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
var cuscon;
var cucon;
var toprow;
var bottomrow;

function buildGPU() {
    d_cus = [];


    let bestfit = {dif: 1000, g: cus}
    toprow = 0.2 * sch;
    bottomrow = sch - toprow;
    svgcon.append("rect")
        .attr("x", schw - (0.5 * toprow))
        .attr("y", 0)
        .attr("width", toprow)
        .attr("height", toprow);

    const aspect = scw / (sch - toprow);
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
    let cudim = Math.min(scw / (colls), bottomrow / rows);
    let gap = cudim;
    cudim -= 10;
    cuscon = svgcon.append("g").attr("transform", "translate(0," + toprow + ")");

    for (let i = 0; i < cus; i++) {
        let g = cuscon.append("g")
            .attr("transform",
                "translate(" +
                (gap * (i % colls)) + "," +
                (gap * (Math.floor(i / colls))) + ")")
            .classed("computeUnit", true)
            .attr("id", i)
            .on("click", function (d) {
                return zoom(this);
            });
        g.append("rect")
            .attr("width", cudim)
            .attr("height", cudim);

        g.append("text")
            .attr("x", cudim / 2)
            .attr("y", cudim / 2)
            .attr("dy", ".35em") //todo find out what this is
            .append('tspan').text("CU:" + i).attr('dy', '.9em');
        d_cus.push(g);
    }

    cucon = ghelper(svgcon, "actualComputeUnit", "Compute Unit", 0, toprow, scw, bottomrow).attr("visibility", "hidden ").on("click", nop);
    gap = bottomrow / 5.2;
    let things = [["lds", "LDS"], ["l1c", "L1 Cache"], ["bmu", "Branch & Msg Unit"], ["scheduler", "Scheduler"], ["tu", "Texture Units"]];
    for (let i = 0; i < things.length; i++) {
        ghelper(cucon, things[i][0], things[i][1], 20, 20 + (i * gap), gap * 0.85, gap * 0.85, true);
    }
    ghelper(cucon, "salu", "Scaler ALU", gap * 1.5, 20, gap * 0.85, gap * 0.85, true);
    ghelper(cucon, "sgpr", "Scaler GPR", gap * 1.5, 20 + gap, gap * 0.85, gap * 0.85, true);
    {
        let vgap = (bottomrow - 40) / simdunits;
        let unitwidth = scw - (gap * 3.5);
        for (let i = 0; i < simdunits; i++) {
            let v = ghelper(cucon, "valu", "Simd Unit " + i, (gap * 3), 20 + (i * vgap), unitwidth, vgap * 0.85, false);
            let lanewidth = (unitwidth - 40) / simdlanes;
            for (let j = 0; j < simdlanes; j++) {
                let lane = ghelper(v, "lane", "Lane " + j, 20 + (lanewidth * j), 20, lanewidth * 0.85, vgap * 0.6, false);

                let vgprheight = (vgap * 0.5) / vgprs;
                for (let k = 0; k < vgprs; k++) {
                    ghelper(lane, "vgpr", k, 2, (vgap * 0.1) + (k * vgprheight), lanewidth * 0.80, vgprheight * 0.9, true);

                }

            }
        }
    }
    svgcon.on("click", reset);

}

function ghelper(parent, css, text, x, y, w, h, labelIn) {
    let g = parent.append("g").attr("transform", "translate(" + x + "," + y + ")").classed(css, true);
    g.rect = g.append("rect").attr("width", w).attr("height", h);
    g.label = g.append("text").text(text);
    if (labelIn) {
        g.label.attr("x", w * 0.1)
        g.label.attr("y", h / 2)
        g.label.call(wrap, w * 0.8);
    }

    return g;
}

var dd;

function zoom(d) {
    dd = d;
    console.log(d);
    var t = cuscon.transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .attr("transform", "translate(" + (scw - (0.25 * scw)) + ",0) scale(0.25,0.25)");

    cucon.label.text("Compute Unit:" + dd.attributes.id.value);
    cucon.transition().duration(d3.event.altKey ? 7500 : 750).attr("visibility", "visible");
    d3.event.stopPropagation();

}

function nop() {
    console.log("nop");
    d3.event.stopPropagation();
}

function reset() {
    console.log("reset");
    var t = cuscon.transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .attr("transform", "translate(0," + toprow + ") scale(1.0,1.0)");
    cucon.transition().duration(d3.event.altKey ? 7500 : 750).attr("visibility", "hidden");
    d3.event.stopPropagation();
}


function updateGPUVis() {
    cuscon.selectAll(".computeUnit").classed("used", function (d, i) {
        return i < usedCUs;
    });
    cuscon.selectAll(".used > text").append('tspan')
        .attr('dy', '.9em').text(function (d, i) {
        return (occupancy[i] * 100)
    });
//cucon.attr("transform","translate("+(scw-(0.25*scw))+",0) scale(0.25,0.25)");
}

function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                .append("tspan")
                .attr("x", x)
                .attr("y", y)
                .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
            }
        }
    });
}
