var dcon;
var svgcon;
var $con;

var selectedCU;

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
d3.selection.prototype.children = function (d) {
    var that = this.node();
    return this
        .selectAll(d)
        .filter(function () {
            return that == this.parentNode;
        });
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
                },
                computeUnitOverview: {
                    w: 1.0,
                    h: 1.0,
                    x: 0,
                    y: 0,
                    layout: "bestfit",
                    contains: {
                        computeUnitAvatar: {
                            w: 1.0,
                            h: 1.0
                        }
                    }
                },
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
    // console.log("layout ", name, e, parent, offsetX, offsetY, me);
    let copies = 1;
    let parentLayout = is(parent.attr("layout")) ? parent.attr("layout") : "vertical";
    let layout = is(e.layout) ? e.layout : "vertical";
    let visibility = is(e.visibility) ? e.visibility : "inherit";
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
            console.log("multiple!", me, me.size());
            copies = me.size();
        }
    }
    me.attr("layout", layout);
    me.attr("visibility", visibility);

    let w, h, x, y, collumncount;
    collumncount = 1;
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
        } else if (parentLayout === "horizontal") {
            w = ow / copies;
            h = oh;
        } else if (parentLayout === "bestfit") {
            //oh what fun
            let bestfit = {dif: 1000, g: cus}
            const aspect = ow / oh;
            for (let g = copies; g > 0; g--) {
                const colls = g;
                const rows = Math.ceil(copies / colls);
                let newaspect = colls / rows;
                let dif = Math.abs(aspect - newaspect);
                if (dif < bestfit.dif) {
                    bestfit.dif = dif;
                    bestfit.g = g;
                }
            }
            console.log(bestfit);
            const colls = bestfit.g;
            const rows = Math.ceil(copies / colls);
            w = h = Math.min(ow / (colls), oh / rows);
            collumncount = colls;
        }
        x = is(e.x) ? e.x : offsetX;
        y = is(e.y) ? e.y : offsetY;
    }

    me.attr("width", w).attr("height", h);

    if (parentLayout === "vertical") {
        me.attr("transform", (d, itr, sel) => {
            return "translate(" + x + "," + (y + (itr * h)) + ")"
        });
    } else if (parentLayout === "horizontal") {
        me.attr("transform", (d, itr, sel) => {
            return "translate(" + (x + (itr * w)) + "," + y + ")"
        });
    } else if (parentLayout === "bestfit") {
        me.attr("transform", (d, itr, sel) => {
            return "translate(" + (x + (w * (itr % collumncount))) + "," + (y + (w * (Math.floor(itr / collumncount)))) + ")";
        });
    } else {
        me.attr("transform", "translate(" + x + "," + y + ")");
    }

    me.attr("id", name).classed(name, true);
    me.each((a, b, c) => {
        let mme = d3.select(c[b]);
        let rect = mme.select("rect");
        rect = rect.empty() ? mme.append("rect") : rect;
        rect.attr("width", w).attr("height", h)
        /*  .attr("fill", () => {
              return ("#" + ((1 << 24) * Math.random() | 0).toString(16))
          }); */
        rect.lower()
    });

    let margin = is(e.margin) ? e.margin : 0.05;

    w = Math.floor((1.0 - margin) * w);
    h = Math.floor((1.0 - margin) * h);
    x = Math.floor((w - ((1.0 - margin) * w)) / 2);
    y = Math.floor((h - ((1.0 - margin) * h)) / 2);




    //console.log(w, h, x, y);
    me.each((a, b, c) => {
        let mme = d3.select(c[b]);
        let text = mme.children("text");
        if (!text.empty()) {
            text.attr("x", x);
            text.attr("y", y + 12);
            text.call(wrap, w);
        }


        let container = mme.select("g");
        container = container.empty() ? mme.append("g") : container;
        container.attr("layout", layout);
        container
            .classed(name + "_container", true)
            .attr("width", w)
            .attr("height", h);

        if (parentLayout === "vertical") {
            container.attr("transform", (d, itr, sel) => {
                return "translate(" + x + "," + (y + (itr * h)) + ")"
            });
        } else if (parentLayout === "horizontal") {
            container.attr("transform", (d, itr, sel) => {
                return "translate(" + (x + (itr * w)) + "," + y + ")"
            });
        }
    });


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
                } else if (layout === "horizontal") {
                    iofx += parseInt(child.attr("width"));
                }
            }
        });
    }
    return me;
}

var cooltimer;

function cool() {
    cooltimer = setInterval(() => {
        d3.selectAll("#SIMDVGPR rect").transition().attr("fill", () => {
            return ("#" + ((1 << 24) * Math.random() | 0).toString(16))
        });
    }, 200);

}


var su1, suc, sm1;


function buildGPU2() {
    recursiveLayouter("root", layout, svgcon, 0, 0);
    selectedCU = (is(selectedCU) ? selectedCU : d3data.computeunits[0]);

    console.log("data bind", selectedCU);
    //build overview
    let overcon = d3.select(".computeUnitOverview").select("g");
    d3.selectAll(".computeUnitAvatar").remove();
   // d3.selectAll(".SIMDUnit").remove();
//
    let cua = overcon.selectAll(".computeUnitAvatar")
        .data(d3data.computeunits)
        .enter()
        .append("g").attr("id", "computeUnitAvatar").classed("computeUnitAvatar",true)
        .on("click", zoom)
        .classed("used", (d) => {
            return d.used;
        })
        .append("text").text((d) => {
            return d.occupancy;
        });

    cua.exit().remove();

    let cuLabel = d3.select(".computeUnit").selectAll(".cutext").data([selectedCU]);
    cuLabel.enter().append("text").classed("cutext",true);
    cuLabel.text((d) => {
        console.log(123, d);
        return "Cu id: " + d.id
    });
    cuLabel.exit().remove();
/*
    d3.select(".computeUnit")
        .select("text")
        .data(selectedCU)
        .enter().append("text").text((d) => {
        return "yolo"+ d;
    });
*/
    //build detail
    let con = d3.select(".cuSIMDContainer").select("g");
    // d3.selectAll("#SIMDUnit").remove();

    su1 = con.selectAll(".SIMDUnit").data(selectedCU.simdunits);

    su1.enter().append("g").attr("id", "SIMDUnit").classed("SIMDUnit",true);
    su1.exit().remove();

    suc = su1.selectAll(".SIMDUnit_container").data((d) => {
        return [d];
    });
    suc.enter().append("g").attr("id", "SIMDUnit_container").classed("SIMDUnit_container",true);
    suc.exit().remove();

    d3.selectAll(".sutext").remove();
    let sut = su1.selectAll(".sutext").data((d) => {
        return [d];
    });
    sut.enter().append("text").attr("id", "sutext").classed("sutext",true);
    sut.exit().remove();
    sut.text((d) => {
        return d.id
    });

    sm1 = suc.selectAll(".SIMDLane").data((d) => {
        return d.lanes;
    });
    sm1.enter().append("g").attr("id", "SIMDLane").classed("SIMDLane",true);
    sm1.exit().remove();


    let sm1t = sm1.selectAll(".smtext").data((d) => {
        return [d];
    });
    sm1t.enter().append("text").attr("id", "smtext").classed("smtext",true);
    sm1t.exit().remove();
    sm1t.text((d) => {
        return is(d.id) ? d.id : -1;
    });

    console.log("bind done");
    d3.selectAll("#SIMDUnit");
    recursiveLayouter("root", layout, svgcon, 0, 0);

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

function zoom(data, iter, element) {
    selectedCU = d3data.computeunits[iter];
    console.log(iter, data, element);
    buildGPU2();
    //how big is toprow
    const trh = d3.select("#toprow").attr("height");
    //how big is cu overview?
    const cuh = d3.select("#computeUnitOverview").attr("height");
    const scalefactor = Math.floor(cuh / trh);

    var t = d3.select("#computeUnitOverview").transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .attr("transform", "translate(0,-" + trh + ") scale(" + 1 / scalefactor + "," + 1 / scalefactor + ")");

    // cucon.label.text("Compute Unit:" + dd.attributes.id.value);
    d3.select("#computeUnit").transition().duration(d3.event.altKey ? 7500 : 750).attr("visibility", "visible");
    d3.event.stopPropagation();

}

function nope() {
    console.log("nop");
    d3.event.stopPropagation();
}

function reset() {
    console.log("reset");
    var t = d3.select("#computeUnitOverview").transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .attr("transform", "translate(0,0) scale(1.0,1.0)");
    d3.select("#computeUnit").transition().duration(d3.event.altKey ? 7500 : 750).attr("visibility", "hidden");
    d3.event.stopPropagation();
}

var d3data = {
    computeunits: [{
        id: 0,
        simdunits: [
            {id: 0, lanes: [{id: 0}, {id: 1}, {id: 2}, {id:3}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]},
            {id: 1, lanes: [{id: 0}, {id: 1}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]},
            {id: 2, lanes: [{id: 0}, {id: 1}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]},
            {id: 3, lanes: [{id: 0}, {id: 1}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]}
        ]
    }]

};


function updateGPUVis() {
    d3data.computeunits = [];
    for (let i = 0; i < cus; i++) {
        let c = {};
        c.id = i;
        c.used = (i < usedCUs);
        c.occupancy = occupancy[i] * 100;
        c.simdunits = [];
        for (let j = 0; j < simdunits; j++) {
            let cs = {};
            cs.id = j;
            cs.lanes = [];
            for (let k = 0; k < simdlanes; k++) {
                let csl = {};
                csl.id = k;
                cs.lanes.push(csl);
            }
            c.simdunits.push(cs);
        }
        d3data.computeunits.push(c);
    }

    buildGPU2();
    buildGPU2();
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
