function main_sim() {
    btn_go = $("#simgobtn");
    console.log("Hello sim");
    if(program === null){
        Warn("Load a Program First!")
        btn_go.prop("disabled", true);
        return;
    }
    btn_go.removeAttr('disabled');
}

let sim_ticks = [];
const simdlanes=16;
const simdunits=4;
const wfSize = simdlanes * simdunits;
const sgprs = 6;
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
    if(reg.startsWith("0x")){
        return "NaR";
    }
    if(reg.startsWith("v")) {
        if (reg.indexOf(":") != -1){
            return "vsplit"
        }
        return "v";
    }
    if(reg.startsWith("s")) {
        if (reg.indexOf(":") != -1){
            return "ssplit";
        }
        return "s";
    }
    return "idklol";
}

function Launchsim(){
    //setup regs
    let opcode = "";
    let kernels = 1;
    let cus = [];
    for(let i =0; i < Math.ceil(kernels / wfSize); ++i){
        cus.push(new ComputeUnit());
    }
    let not_finished = true;
    let hh = 100;
    while(not_finished && hh > 0) {
        not_finished = false;
        hh--;
        for (let c of cus) {
            not_finished |= c.tick();
        }
    }
    console.log("done");
}

function tick(){

}


class ComputeUnit {
    constructor() {
        this.pc =0;
        this.sALU = 0;
        this.LDS = 0;
        this.vALUs = [];
        this.SGPR = [];
        this.done = false;
        for(let i =0; i < sgprs; ++i){
            this.SGPR.push(new Register());
        }
        for(let i =0; i < simdunits; ++i){
            this.vALUs.push(new V_ALU(i));
        }

    }
    get opcode() {
        return program.kernel.asm.instructions[this.pc].opcode;
    }
    get operand() {
        return program.kernel.asm.instructions[this.pc].operand;
    }

    writeTo(loc,what = 1){
        console.log("write",loc);

    }

    tick() {
        if(this.done || this.opcode == "s_endpgm" ){
            this.done = true;
            console.log(this, "cu done");
            return false;
        }
        let isa = getIsa(this.opcode);
        console.log(this, "cu tick", this.opcode,isa );


        //do writes
        if(isa.w){
            for (let w of isa.w) {
             this.writeTo(this.operand[w]);
            }
        }

        this.pc++;
        return true;
    }
}

class V_ALU {
    constructor(id) {
        this.id = id;
        this.lanes = [];
        for(let i =0; i < simdlanes; ++i){
            this.lanes.push(new V_ALU_lane(i));
        }
    }
    write(loc,what =1){
        for (let w of simdlanes) {

        }
    }
}

class V_ALU_lane {
    constructor(id){
        this.VGPR = [];
    }
}

class Register{
    constructor(){
        this.value = 0;
    }
}