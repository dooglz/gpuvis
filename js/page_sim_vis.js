var viscon;
var $viscon;
var bigViewCon,cuViewCon,taskmanViewCon;
var scw = 0;
var sch = 0;
var schw = 0;
var schh = 0;

function initvis() {
    viscon = d3.select("#viscontainer");
    $viscon = $("#viscontainer");
    scw = 2 * Math.floor($viscon.width() / 2); //floor to nearest even number
    sch = 2 * Math.floor($viscon.height() / 2);
    schw = 0.5 * scw;
    schh = 0.5 * sch;
    bigViewCon = viscon.append('div').attr("id", "bigViewCon") .attr("class","bigViewCon");
    cuViewCon = viscon.append('div').attr("id", "cuViewCon") .attr("class","cuViewCon");
    taskmanViewCon = viscon.append('div').attr("id", "taskmanViewCon").attr("class","taskmanViewCon");
    buildBigView();
    buildCuView();
    buildTaskManView();
}

function buildBigView(){
    let container = bigViewCon;
    let current =  gpustate;
    while(current.children){
        console.log(current);
        container= container.selectAll(current.children[0].type)
            .data(function(d) { return current.children;})
            .enter().append("div")
            .attr("id", (d)=>{return d.type + '-'+d.id})
            .attr("class",(d)=>{return d.type});
        container.append("div") .attr("class","label").html((d)=>{return d.type + '-'+d.id});
        current = current.children[0];
    }
}

function buildCuView(){
    let container = cuViewCon;
}

function buildTaskManView(){

}