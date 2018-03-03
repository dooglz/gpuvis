var div_kernel_source;
var div_kernel_asm;
var div_coderow;
var isa;
var program;
var show_regs = true;
var simplifyConstants = true;
$(document).ready(function () {
    console.log("hello world");
    div_kernel_source = $("#kernel_source");
    div_kernel_asm = $("#kernel_asm");
    div_coderow = $("#coderow");
    $.getJSON("data/isa.json")
        .done(function (data) {
            console.log("isa loaded");
            isa = data;
            startup();
        })
        .fail(function () {
            console.error("Can't get isa!");
        });
});

function startup() {
    $.getJSON("data/helloworld.program.json")
        .done(function (data) {
            ShowKernel(data);
        })
        .fail(function () {
            console.error("Can't get Program!");
        });
}
function ShowKernel(data) {
    program = data;
    ParseAsm(data.kernel.asm);
    div_coderow.empty();
    let blocks = [];

    if (data.kernel.source !== undefined) {
        blocks.push({title:"kernel_source",text:data.kernel.source});
       // Prism.highlightElement(div_kernel_source[0]);
    }else{
        console.error("No kernel code!");
    }

    if(data.kernel.asm.instructions !== undefined){
        let str = "";
        let i =0;
        for (let o of data.kernel.asm.instructions) {
            if(show_regs && data.kernel.asm.registers) {
                let regs = Object.keys(data.kernel.asm.registers).filter(key => key[0] == "v" && key[1] != "[");
                for (let rn of regs) {
                    let r = data.kernel.asm.registers[rn];
                    var writtento = false;
                    var willReadAgain = true;
                    var readwritenow = false;
                    var nextwrite = 0;
                    var nextread = 0;
                    for (let rw of r.w) {
                        if(rw == i){
                            str += "W";
                            readwritenow = true;
                        }else if(rw < i){
                            writtento = true;
                        }else{
                            nextwrite = nextwrite == 0 ? rw : Math.min(rw,nextwrite);
                        }
                    }
                    for (let rr of r.r) {
                        if(rr == i){
                            str += "R"
                            readwritenow = true;
                        }else if(rr > i) {
                            nextread = nextread == 0 ? rr : Math.min(rr,nextread);
                        }
                    }
                    if(readwritenow){continue;}
                    willReadAgain = nextread < nextwrite || (nextread > i && nextwrite ==0);
                    if(willReadAgain && writtento){
                        str += ":"
                    }else{
                        str += " "
                    }
                }
                str += "|"
            }

            str += o.opcode + "\t"+(o.opcode.length < 14 ? "\t" : "") + o.operand.join(" ")+ "\n";
            i++;
        }
        blocks.push({title:"kernel_asm",text:str});
    }
    let bw = Math.floor(12.0 / blocks.length);
    for (let o of blocks) {
        let div = $("<div/>",{class:"col col-lg-"+Math.min(bw,o.fw || bw)});
        div.append($("<p>"+o.title+"</p>"));
        let pre = $("<pre/>").appendTo(div);
        let code = $("<code/>",{class:"language-C line-numbers"}).appendTo(pre);
        code.text(o.text);
        Prism.highlightElement(code[0]);
        div_coderow.append(div);
    }
}

function ParseAsmFromRaw(asm){
    let res = asm.split("\n");
    let obj = [];
    for (let o of res) {
        o = o.replace(/  +/g, ' ').replace(/(,| $|^ )/g, '');
        var opcode = o.substr(0,o.indexOf(" "));
        var operand = o.substr(o.indexOf(" ")+1).split(" ");
        obj.push({opcode:opcode,operand:operand});
    }
    return obj;
};


function Refresh(){
    ShowKernel(program);
}

function isRegister(str){
    if(str.startsWith("0x")){
        return false;
    }
    const regex = /^(v|s)(\d+|\[\d+\:\d+\])/g;
    if(regex.exec(str) !== null){
        return true;
    }
    //not 100% sure
    return false;
}

function splitReg(str){
    let split = str.indexOf(":");
    if(split == -1){
        return false;
    }
    let end = str.length -1;
    let min = parseInt(str.substring(2,split));
    let max = parseInt(str.substring(split+1,end));
    let ret = [];
    for (let i = Math.min(min,max); i <= Math.max(min,max); i++) {
        ret.push(str[0]+i);
    }
    return ret;
}


function ParseAsm(asm) {
    asm.metrics = {};
    asm.metrics.NumVgprs =0;
    asm.metrics.NumSgprs =0;
    asm.registers = [];
    let i =0;
    for (let o of asm.instructions) {
        let isacode = isa.find(function(e) {
            return e.opcode === o.opcode;
        });
        if(isacode !== undefined){
            o.isaref = isacode;
            if(isacode.type == "s"){
                asm.metrics.NumSgprs++;
            }else if(isacode.type == "v"){
                asm.metrics.NumVgprs;
            }
            if(isacode.r !== undefined) {
                o.registers = {w: [], r: []};
                for (let rd of isacode.r) {
                    let reg = o.operand[rd];
                    if (isRegister(reg)) {
                        let split = splitReg(reg);
                        if(split){
                            for (let rg of split) {
                                asm.registers[rg] = asm.registers[rg] || {r: [], w: []};
                                asm.registers[rg].r.push(i);
                            }
                        }else {
                            asm.registers[reg] = asm.registers[reg] || {r: [], w: []};
                            asm.registers[reg].r.push(i);
                        }
                    }
                }
            }
            if(isacode.w !== undefined){
                for (let rd of isacode.w) {
                    let reg = o.operand[rd];
                    if(isRegister(reg)){
                        let split = splitReg(reg);
                        if(split){
                            for (let rg of split) {
                                asm.registers[rg] = asm.registers[rg] || {r: [], w: []};
                                asm.registers[rg].w.push(i);
                            }
                        }else {
                            asm.registers[reg] = asm.registers[reg] || {r: [], w: []};
                            asm.registers[reg].w.push(i);
                        }
                    }
                }
            }
        }else{
            console.warn("unknown isa opcode",o.opcode,o);
        }
        if(simplifyConstants) {
            for (oi = 0; oi < o.operand.length; oi++) {
                let opr = o.operand[oi];
                if (!isRegister(opr)) {
                    let int = parseInt(opr);
                    if (isNaN(int)) {
                        continue;
                    }
                    if (int >= 32 && int < 122) {
                        int = int + "'" + String.fromCharCode(int) + "'";
                    }
                    o.operand[oi] = opr + "(" + int + ")";
                }
            }
        }
        ++i;
    }
};
