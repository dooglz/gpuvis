function main_sim() {
    btn_go = $("#simgobtn");
    console.log("Hello sim");
    initvis();
    if(!is(program)|| !is(isa)){
        Warn("Load a Program+ISA First!")
        btn_go.prop("disabled", true);
        return;
    }
    btn_go.removeAttr('disabled');

}

//let sim_ticks = [];
const cus = 56
const simdlanes=16;
const simdunits=4;
const wfSize = simdlanes * simdunits;
const sgprs = 12;
const vgprs = 7;

function getIsa(code){
    let isacode = isa.codes.find(function(e) {
        return e.opcode === code;
    });
    if(isacode === undefined){
        console.error("unkown opcode",code);
    }
    return isacode;
}

function registerDecode(reg){
    let split = function(reg){
        let m = reg.indexOf(":");
        let l = reg.indexOf("[");
        let r = reg.indexOf("]");
        let low = parseInt(reg.slice(l+1,m));
        let high = parseInt(reg.slice(m+1,r));
        return Array((high-low)+1).fill().map((e,i)=>i+low);
    }

    if(reg.startsWith("0x")){
        return {type:"constant",val:parseInt(reg)};
    }
    if(reg.startsWith("v")) {
        if (reg.indexOf(":") != -1){
            return {type:"vsplit",val:split(reg)};
        }
        return {type:"v",val:parseInt(reg.slice(1))};
    }
    if(reg.startsWith("s")) {
        if (reg.indexOf(":") != -1){
            return {type:"ssplit",val:split(reg)};
        }
        return {type:"s",val:parseInt(reg.slice(1))};
    }
    if(!isNaN(parseInt(reg))){
        return {type:"constant",val:parseInt(reg)};
    }
    console.error("Can't decode register",reg);
    return {type:"idklol",val:reg};
}

var globalTick = 0;
var globalRegList = [];
var globalSRegList = [];
var globalVRegList = [];
var globalUnknownWrites =0;
var globalUnknownReads =0;
var globalVIdleTicks = 0;
var globalVWorkTicks = 0;
var usedCUs =0;
var occupancy = [];
function Launchsim(){
    try {
        //setup regs
        globalRegList = [];
        globalSRegList = [];
        globalVRegList = [];
        globalUnknownWrites =0;
        globalUnknownReads =0;
        globalIdleTicks = 0;
        let opcode = "";
        let kernels = 1;
        let cus = [];
        for(let i =0; i < Math.ceil(kernels / wfSize); ++i){
            cus.push(new ComputeUnit(i));
        }
        usedCUs = cus.length;
        console.log("Launching sim with CU:", cus.length);
        let not_finished = true;
        let tickcount = 0;
        while(not_finished && tickcount < 100) {
            $("#simstatus").text(tickcount + " / " + (program.kernel.asm.instructions.length - 1));
            not_finished = false;
            tickcount++;
            globalTick = tickcount;
            for (let c of cus) {
                not_finished |= c.tick();
            }
        }
        console.log("done");
        calcStats(cus.length);
        updateGPUVis();
    }catch (e) {
        console.error(e);
        $("#simstatus").html("sim Error <br>"+JSON.stringify(e));
    }
}

function calcStats(cuCount){
    let reglists = {Total:globalRegList,Scaler:globalSRegList,Vector:globalVRegList};
    let totals = {Scaler:cuCount*sgprs,Vector:cuCount*simdunits*simdlanes*vgprs}
    totals.Total=totals.Scaler + totals.Vector;
    let ret = "";
    for (let rl in reglists) {
        let readregs = 0;
        let writtenregs = 0;
        let totalwrites = 0;
        let rotalreads =0;
        for (let r of reglists[rl]) {
            if(r.reads.length > 0){readregs++;}
            if(r.writes.length > 0){writtenregs++;}
            totalwrites +=r.writes.length;
            rotalreads += r.reads.length;
        }
        ret+="<p>"+rl+" registers written to: "+ writtenregs +" / " + totals[rl] +
            "<br>"+rl+" registers read from: "+ readregs +" / " + totals[rl] +
            "<br>"+rl+" register reads: "+ rotalreads +
            "<br>"+rl+" register writes: "+ totalwrites + "</p>";
    }
    ret+="<p>Unaccounted Writes: " +globalUnknownWrites+
        "<br>Unaccounted Reads: " +globalUnknownReads+"</p>";

    ret+="<p>Acive SIMD Ticks:" +globalVWorkTicks+
        "<br>Idle SIMD Ticks: " +globalVIdleTicks+
        "<br>Local Occupancy: " + sigFigs((globalVWorkTicks/(globalVWorkTicks+globalVIdleTicks))*100,4)+'%'+
        "<br>Global Occupancy: " + sigFigs((globalVWorkTicks/((globalVWorkTicks+globalVIdleTicks)*cus))*100,4)+ "%</p>";

    occupancy[0] = (globalVWorkTicks/(globalVWorkTicks+globalVIdleTicks));
    $("#simresults").html(ret);
}

class ComputeUnit {
    constructor(gid,lid) {
        this.gid = gid;
        this.lid = lid;
        this.pc =0;
        this.sALU = 0;
        this.LDS = 0;
        this.vALUs = [];
        this.SGPR = [];
        this.done = false;
        this.reads = [];
        this.writes = [];
        this.tickreads = [];
        this.tickwrites = [];
        this.lastTick = 0;
        this.execMask = Array(simdunits*simdlanes).fill(false);
        this.execMask[0] = true;
        for(let i =0; i < sgprs; ++i){
            let r =new Register(this.gid+'_sgpr_'+i);
            globalSRegList.push(r)
            this.SGPR.push(r);
        }
        for(let i =0; i < simdunits; ++i){
            this.vALUs.push(new V_ALU(this.gid+'_'+i,i));
        }
    }
    get opcode() {
        return program.kernel.asm.instructions[this.pc].opcode;
    }
    get operand() {
        return program.kernel.asm.instructions[this.pc].operand;
    }

    writeTo(loc,what = 1){
        let o = {tick:globalTick,loc:loc,what:what};
        this.writes.push(o);
        this.tickwrites.push(o);
        let rd = registerDecode(loc);
        if(rd.type === "s"){
            this.SGPR[rd.val].write(what);
        }else if(rd.type === "ssplit"){
            for(let r of rd.val){
                this.SGPR[r].write(what);
            }
        }else{
            //TODO
        }
    }
    readFrom(loc){
        let o = {tick:globalTick,loc:loc};
        this.reads.push(o);
        this.tickreads.push(o);
        let rd = registerDecode(loc);
        if(rd.type === "s"){
            this.SGPR[rd.val].read();
        }else if(rd.type === "ssplit"){
            for(let r of rd.val){
                this.SGPR[r].read();
            }
        }else{
            //TODO
        }
    }

    tick() {
        if(this.done || this.opcode == "s_endpgm" ){
            this.done = true;
            console.log(this, "cu done");
            return false;
        }
        this.lastTick = globalTick;
        this.tickreads = [];
        this.tickwrites = [];
        let isac = getIsa(this.opcode);
        console.log(this.id, "cu tick",this,this.opcode,isac );
        if(isac.type === "v" || isac.type === "flat"){
            for(let s of this.vALUs){
                s.tick(isac,this.opcode,this.operand,this.execMask);
                this.tickreads.push(s.tickreads);
                this.tickwrites.push(s.tickwrites);
            }
            console.log(this.id, "v reads",this.tickreads ,"v writes",this.tickwrites);
        }else if(isac.type === "s"){
            //do reads
            if(isac.r){
                for (let r of isac.r) {
                    this.readFrom(this.operand[r]);
                }
            }
            //do writes
            if(isac.w){
                for (let w of isac.w) {
                 this.writeTo(this.operand[w]);
                }
            }
            console.log(this.id, "s reads",this.tickreads ,"s writes",this.tickwrites);
        }else{
            console.error(isac.type);
        }

        this.pc++;
        return true;
    }
}

class V_ALU {
    constructor(gid,lid) {
        this.gid = gid;
        this.lid = lid;
        this.lanes = [];
        this.reads = [];
        this.writes = [];
        this.tickreads = [];
        this.tickwrites = [];
        for(let i =0; i < simdlanes; ++i){
            this.lanes.push(new V_ALU_lane(this.gid+'_'+i,(this.lid*simdlanes)+i));
        }
    }
    tick(isac,opcode,operand,execMask){
        this.tickreads = [];
        this.tickwrites = [];
        for(let l of this.lanes) {
            l.tick(isac,opcode,operand,execMask);
            this.tickreads.push(l.tickreads);
            this.tickwrites.push(l.tickwrites);
        }
        this.reads.push(this.tickreads);
        this.writes.push(this.tickwrites);
       // console.info(this.id, "reads",tickreads,"writes",tickwrites);
    }
}

class V_ALU_lane {
    constructor(gid,lid){
        this.gid = gid;
        this.lid = lid;
        this.VGPR = [];
        this.reads = [];
        this.writes = [];
        this.tickreads = [];
        this.tickwrites = [];
        this.lasttick = 0;
        for(let i =0; i < vgprs; ++i){
            let r = new Register(this.gid+'_vgpr_'+i)
            globalVRegList.push(r)
            this.VGPR.push(r);
        }
    }
    writeIndirect(loc,what = 1){
        let o = {tick:globalTick,loc:"IND",what:what};
        this.writes.push(o);
        this.tickwrites.push(o);
        globalUnknownWrites++;
    }
    readIndirect(loc){
        let o = {tick:globalTick,loc:"IND"};
        this.reads.push(o);
        this.tickreads.push(o);
        globalUnknownReads++;
    }
    writeTo(loc,what = 1){
        let o = {tick:globalTick,loc:loc,what:what};
        this.writes.push(o);
        this.tickwrites.push(o);
        let rd = registerDecode(loc);
        if(rd.type === "v"){
            this.VGPR[rd.val].write(what);
        }else if(rd.type === "vsplit"){
           for(let r of rd.val){
               this.VGPR[r].write(what);
           }
        }else{
            //TODO
        }
    }
    readFrom(loc){
        let o = {tick:globalTick,loc:loc};
        this.reads.push(o);
        this.tickreads.push(o);
        let rd = registerDecode(loc);
        if(rd.type === "v"){
            this.VGPR[rd.val].read();
        }else if(rd.type === "vsplit"){
            for(let r of rd.val){
                this.VGPR[r].read();
            }
        }else{
            //TODO
        }
    }
    tick(isac,opcode,operand,execMask){
        this.tickreads = [];
        this.tickwrites = [];
        this.lasttick = globalTick;
        if(!execMask[this.lid]){
            globalVIdleTicks++;
            return;
        }
        globalVWorkTicks++;
        //do reads
        if(isac.r){
            for (let r of isac.r) {
                this.readFrom(operand[r]);
            }
        }
        if(isac.ri){
            for (let r of isac.ri) {
                this.readIndirect(operand[r]);
            }
        }
        //do writes
        if(isac.w){
            for (let w of isac.w) {
                this.writeTo(operand[w]);
            }
        }
        if(isac.wi){
            for (let w of isac.wi) {
                this.writeIndirect(operand[w]);
            }
        }
    }
}

class Register{
    constructor(id = "unnamed"){
        this.value = 0;
        this.reads = [];
        this.writes = [];
        this.id = id;
        globalRegList.push(this);
    }
    read(){
        this.reads.push(globalTick);

    }
    write(data = 1){
        this.writes.push(globalTick);
    }
}