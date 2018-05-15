var dcon;
var svgcon;
var $con;

var scw = 0;
var sch = 0;
var schw = 0;
var schh = 0;

d3.selection.prototype.size = function () {
    var n = 0;
    this.each(function () {
        ++n;
    });
    return n;
};

let layout = {
    w: 1.0,
    h: 1.0,
    margin: 0,
    contains: {
        toprow: {
            margin: 0,
            w: 1.0,
            h: 0.1,
            contains: {}
        },
        bottomrow: {
            margin: 0,
            w: 1.0,
            h: 0.9,
            contains: {
                computeUnitOverview: {
                    w: 1.0,
                    h: 1.0,
                    x: 0,
                    y: 0,
                    contains: {}
                },
                computeUnit: {
                    w: 1.0,
                    h: 1.0,
                    x: 0,
                    y: 0,
                    visibility: "hidden",
                    layout: "horizontal",
                    contains: {
                        cuNonSimContainer: {
                            w: 0.1,
                            h: 1.0,
                            contains: {
                                LDS: {
                                    w: 1.0,
                                    h: 0.2
                                },
                                L1Cache: {
                                    w: 1.0,
                                    h: 0.2
                                },
                                BMU: {
                                    w: 1.0,
                                    h: 0.2
                                },
                                Scheduler: {
                                    w: 1.0,
                                    h: 0.2
                                },
                                TextureUnit: {
                                    w: 1.0,
                                    h: 0.2
                                }
                            }
                        },
                        cuScalerContainer: {
                            w: 0.1,
                            h: 0.5,
                            contains: {
                                SALU: {
                                    w: 1.0,
                                    h: 1.0,
                                    contains: {
                                        SGPR: {
                                            w: 1.0,
                                            h: 0.5,
                                            float: "bottom"
                                        }
                                    }
                                },
                            }
                        },
                        cuSIMDContainer: {
                            w: 0.8,
                            h: 1.0,
                            contains: {
                                SIMDUnit: {
                                    w: 1.0,
                                    h: 1.0,
                                    layout: "horizontal",
                                    contains: {
                                        SIMDLane: {
                                            w: 1.0,
                                            h: 1.0,
                                            float: "bottom",
                                            contains: {
                                                SIMDVGPR: {
                                                    w: 1.0,
                                                    h: 0.5
                                                }
                                            }
                                        },
                                    }
                                },
                            }
                        }
                    }
                }
            }
        }
    }
};
let layoutleafs = {};

function getLeafs(a) {
    for (k in a.contains) {
        layoutleafs[k] = a.contains[k];
        getLeafs(a.contains[k]);
    }
}

getLeafs(layout);

//t layoutleafs={
//  toprow:layout.contains.toprow,
//  bottomrow:layout.contains.bottomrow,
//  computeUnitOverview:this.bottomrow.contains.computeUnitOverview,
//  computeUnit:this.bottomrow.contains.computeUnit,
//  cuNonSimContainer:this.computeUnit.contains.cuNonSimContainer,
//  cuScalerContainer:this.computeUnit.contains.cuScalerContainer,
//  cuSIMDContainer:this.computeUnit.contains.cuSIMDContainer,
//  SIMDUnit:this.cuSIMDContainer.contains.SIMDUnit
//


function initvis() {
    dcon = d3.select("#viscontainer");
    $con = $("#viscontainer")
    scw = 2 * Math.floor($con.width() / 2); //floor to nearest even number
    sch = 2 * Math.floor($con.height() / 2);
    schw = 0.5 * scw;
    schh = 0.5 * sch;
    svgcon = dcon.append("svg").attr("width", scw).attr("height", sch);
    buildGPU2();
}

var d_cus = [];
var cuscon;
var cucon;
var toprow;
var bottomrow;

function recursiveLayouter(name, e, parent, offsetX, offsetY, me) {
    console.log("layout ", name, e, parent, offsetX, offsetY, me);
    let copies = 1;
    let parentLayout = is(parent.layout) ? parent.layout : "vertical";
    if (!is(me)) {
        //am I already here?
        me = parent.selectAll('#' + name);
        if (me.size() === 0) {
            //no,
            me = parent.append("g");
        } else if (me.size() === 1) {
            //I'm already here

            console.info("reuse");
        } else {
            //I'm already here, and a few more of me
            console.log("multiple!", me);
            copies = me.size();
        }
    }

    let w, h, x, y;
    if (copies === 1) {
        w = Math.floor((e.w ? e.w : 1.0) * parseInt(parent.attr("width")));
        h = Math.floor((e.h ? e.h : 1.0) * parseInt(parent.attr("height")));
        x = is(e.x) ? e.x : offsetX;
        y = is(e.y) ? e.y : offsetY;
    } else {
        let ow = Math.floor((e.w ? e.w : 1.0) * parseInt(parent.attr("width")));
        let oh = Math.floor((e.h ? e.h : 1.0) * parseInt(parent.attr("height")));
        if (parentLayout === "vertical") {
            w = ow;
            h = oh / copies;
        } else {
            w = ow / copies;
            h = oh;
        }
        x = is(e.x) ? e.x : offsetX;
        y = is(e.y) ? e.y : offsetY;
    }

    me.attr("width", w).attr("height", h);

    if (parentLayout === "vertical") {
        me.attr("transform", (d, itr, sel) => {
            return "translate(" + x + "," + (y + (itr * h)) + ")"
        });
    } else {
        me.attr("transform", (d, itr, sel) => {
            return "translate(" + (x + (itr * w)) + "," + y + ")"
        });
    }


    me.attr("id", name).classed(name, true);
    me.each((a, b, c) => {
        let mme = d3.select(c[b]);
        let rect = mme.select("rect");
        rect = rect.empty() ? mme.append("rect") : rect;
        rect.attr("width", w).attr("height", h)
            .attr("fill", () => {
                return ("#" + ((1 << 24) * Math.random() | 0).toString(16))
            });
    });

    let margin = is(e.margin) ? e.margin : 0.05;

    w = Math.floor((1.0 - margin) * w);
    h = Math.floor((1.0 - margin) * h);
    x = Math.floor((w - ((1.0 - margin) * w)) / 2);
    y = Math.floor((h - ((1.0 - margin) * h)) / 2);
    //console.log(w, h, x, y);
    me.each((a, b, c) => {
        let mme = d3.select(c[b]);
        let container = mme.select("g");
        container = container.empty() ? mme.append("g") : container;

        container
            .attr("width", w)
            .attr("height", h);

        if (parentLayout === "vertical") {
            container.attr("transform", (d, itr, sel) => {
                return "translate(" + x + "," + (y + (itr * h)) + ")"
            });
        } else {
            container.attr("transform", (d, itr, sel) => {
                return "translate(" + (x + (itr * w)) + "," + y + ")"
            });
        }
    });


    let layout = is(e.layout) ? e.layout : "vertical";
    if (is(e.contains)) {
        let childCount = Object.keys(e.contains);
        me.each((a, iter, nodes) => {
            let iofx = 0;
            let iofy = 0;
            for (let c in e.contains) {

                let mme = d3.select(nodes[iter]);
                let container = mme.select("g");
                let child = recursiveLayouter(c, e.contains[c], container, iofx, iofy);
                if (layout === "vertical") {
                    iofy += parseInt(child.attr("height"));
                } else {
                    iofx += parseInt(child.attr("width"));
                }
            }
        });
    }
    return me;
}

var d3data = {
    simdunits: [
        {id: 0, lanes: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]},
        {id: 1, lanes: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]},
        {id: 2, lanes: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]},
        {id: 3, lanes: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]}
    ]
};

function buildGPU2() {
    recursiveLayouter("root", layout, svgcon, 0, 0);
    console.log("data bind");
    let con = d3.select("#cuSIMDContainer").select("g");
    let simdunits = con.selectAll("#SIMDUnit")
        .data(d3data.simdunits)
        .enter().append("g").attr("id", "SIMDUnit").append("g");
    simdunits.selectAll("#SIMDLane")
        .data((d)=>{ return d.lanes;})
        .enter().append("g").attr("id", "SIMDLane");

    //    .call((sel) => {
    //        recursiveLayouter("SIMDUnit", layoutleafs.SIMDUnit, con, 0, 0, sel);
    //     })
    //   newSimd.append("rect");
    // newSimd.append("g");
    // .each((d,ind,list)=>{recursiveLayouter("SIMDUnit", layoutleafs.SIMDUnit,con,0,0,list[ind]);})
    // .call((a,b,c,d)=>{ggb = a;})

    console.log("bind done");
    d3.selectAll("#SIMDUnit");
    recursiveLayouter("root", layout, svgcon, 0, 0);
}


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

    cucon = ghelper(svgcon, "actualComputeUnit", "Compute Unit", 0, toprow, scw, bottomrow).attr("visibility", "hidden ").on("click", nope);
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

function nope() {
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
            tspan = text.text(null)
                .append("tspan")
                .attr("x", x)
                .attr("y", y)
                .attr("dy", "0em");
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
                    .attr("dy", ++lineNumber * lineHeight + "em")
                    .text(word);
            }
        }
    });
}
