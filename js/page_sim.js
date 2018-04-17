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
const wfSize = 64;
const simdlanes=16;
const simdunits=4;
const sgprs = 6;
const vgprs = 7;

function Launchsim(){
    //setup regs
    let pc = 0;
    let opcode = "";
    let cu = new ComputeUnit();
    while(opcode !== "s_endpgm"){
        for(let i =0; i < wfSize; ++i){

        }
        pc++;
    }

}

function tick(){

}


class ComputeUnit {
    constructor() {
        this.sALU = 0;
        this.LDS = 0;
        this.vALUs = [];
        this.SGPR = [];
        for(let i =0; i < sgprs; ++i){
            this.SGPR.push(new Register());
        }
        for(let i =0; i < simdunits; ++i){
            this.vALUs.push(new V_ALU(i));
        }

    }
    get area() {
        return this.calcArea();
    }
    calcArea() {
        return this.height * this.width;
    }
}

class V_ALU {
    constructor(id) {
        this.id = id;
        this.lanes = [];
        for(let i =0; i < simdlanes; ++i){
            this.vALUs.lanes(new V_ALU_lane(i));
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