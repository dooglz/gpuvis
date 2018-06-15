var viscon;
var $viscon;
var loader;
var bigViewCon, cuViewCon, taskmanViewCon;
var scw = 0;
var sch = 0;
var schw = 0;
var schh = 0;


let vis = {};
vis.currentview = "";

function showspinner(state, cb) {
    const nowtsate = (loader.is(":visible") === state);
    if (state === true) {
        loader.show();
    } else {
        loader.hide();
    }
    if (!nowtsate && cb !== undefined) {
        window.setTimeout(cb, 1000);
    }
    return nowtsate;
}

vis.clear = function (cb) {
    viscon.html("");
    bigViewCon = viscon.append('div').attr("id", "bigViewCon").attr("class", "bigViewCon");
    cuViewCon = viscon.append('div').attr("id", "cuViewCon").attr("class", "cuViewCon");
    taskmanViewCon = viscon.append('div').attr("id", "taskmanViewCon").attr("class", "taskmanViewCon");
    vis.currentview = "";
    if (cb) {
        window.setTimeout(cb, 1000);
    }
};

vis.cuview = function (id) {
    if (!showspinner(true, () => {
        vis.cuview(id)
    })) {
        return;
    }
    const me = "cuview"
    if (vis.currentview !== me && vis.currentview !== "") {
        vis.clear();
    }
    vis.currentview = me;
    buildCuView(id);
    showspinner(false);
};

vis.bigview = function () {
    if (!showspinner(true, vis.bigview)) {
        return;
    }
    const me = "bigview"
    loader.show();
    if (vis.currentview !== me && vis.currentview !== "") {
        vis.clear();
    }
    vis.currentview = me;
    buildBigView();
    showspinner(false);
};

vis.taskmanview = function () {
    if (!showspinner(true, vis.taskmanview)) {
        return;
    }
    const me = "taskman";
    loader.show();
    if (vis.currentview !== me && vis.currentview !== "") {
        vis.clear();
    }
    vis.currentview = me;

    buildTaskManView();
    showspinner(false);
};

function initvis() {
    viscon = d3.select("#viscontainer");
    $viscon = $("#viscontainer");
    loader = $(".loadercon");
    scw = 2 * Math.floor($viscon.width() / 2); //floor to nearest even number
    sch = 2 * Math.floor($viscon.height() / 2);
    schw = 0.5 * scw;
    schh = 0.5 * sch;
    vis.clear();
    vis.cuview(2);
    //vis.bigview();
}

function labelSwap(d, mask) {
    if (mask[d]) {
        return mask[d];
    }
    return d;
}

function defaultLabel(d) {
    return d.type + '-' + d.id + (d.val !== undefined ? (":" + d.val) : "");
}

function pipey(a, b, c, d, e) {
    console.log('a', a, 'b', b, 'c', c, 'd', d);
}

function TestLiveData() {
    console.log("new data");
    let _recurse = function (a) {
        a.val = Math.ceil(Math.random() * 9);
        if (a.isa !== undefined) {
            a.isa = (Math.random() < 0.6) ? "nop" : "v_mov_b32";
        }
        if (a.children) {
            a.children.forEach(_recurse)
        }
    };
    gpustate.children.forEach(_recurse);
}

function recursive(baseSelection, data, textFunc, verbosity, maxdepth) {
    let _recurse = function (d, idx, selection, depth, depthstring) {
        if (d.children === undefined) {
            return;
        }
        depth++;
        if (depth > maxdepth) {
            return;
        }

        if (d.type) {
            depthstring += "_" + d.type + '-' + d.id;
        } else {
            depthstring += "_?";
        }

        console.log('Building', depth, depthstring);

        let childData = d.children;
        let container = d3.select(this);
        let types = new Set();

        childData.forEach((c) => {
            if ((c.v && c.v > verbosity)) {
                return;
            }
            types.add(c.type)
        });
        let typesWithData = [];
        types.forEach((t) => {
            let dataFiltered = childData.filter(c => c.type == t);
            typesWithData.push({type: t, children: dataFiltered});
        });

        //for each type of child
        typesWithData.forEach((t) => {
            //Append a bare div of class .child_container
            let containerDiv = container.selectAll("." + t.type + "_container").data([t])
            let containerDivEnter = containerDiv
                .enter().append("div")
                .attr("class", (d) => {
                    return d.type + "_container childcontainer"
                });
            //for each of those divs (there's only ever going to be one here)
            containerDiv.merge(containerDivEnter).each(
                function (data, idx, c2) {
                    //append a div for each child
                    let div = d3.select(this).selectAll("." + data.type).data(data.children);
                    let divEnter = div
                        .enter().append("div")
                        .attr("id", (d) => {
                            return d.type + '-' + d.id
                        })
                        .attr("class", (d) => {
                            return d.type
                        });
                    //append a label div inside it
                    let titleEnter = divEnter.append("div").attr("class", "label");
                    div.select(".label").merge(titleEnter).text(textFunc);
                    //do the update(merge), and recurse
                    div.merge(divEnter).each(
                        function (a, b, c) {
                            _recurse.call(this, a, b, c, depth, depthstring);
                        }
                    );
                }
            );

        });
    };
    maxdepth = maxdepth === undefined ? 9999 : maxdepth;
    baseSelection.data([data]).each(function (a, b, c) {
        _recurse.call(this, a, b, c, 0, "");
    });
}

function buildBigView() {
    let container = bigViewCon;
    let current = gpustate;

    recursive(container, current, defaultLabel, 3);
}

function buildCuView(id) {
    let labelmask = {"SimdLane": "Lane"};
    let container = cuViewCon;
    let current = gpustate.children[id];
    {
        let title = container.selectAll(".cutitle").data([current]);
        let titleEnter = title.enter().append('div').attr("class", "cutitle");
        title = titleEnter.merge(title)
            .html((d) => "<h3>Compute Unit " + d.id + "</h3>");
    }

    recursive(container, current, defaultLabel, 3);
}

function buildTaskManView() {
    let container = taskmanViewCon;
    let current = gpustate
    //recursive(container, current, (d)=>{return d.type.slice(0,2)}, 2,3);
    recursive(container, current, (d) => {
        return ""
    }, 2, 3);
    taskmanViewCon.selectAll(".label").remove();
    taskmanViewCon.selectAll(".SimdLane").classed("inuse", (d) => {
        return (d.isa && d.isa !== "nop");
    });
}































