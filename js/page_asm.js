var div_kernel_source;
var div_kernel_asm;
var div_coderow;
var div_statsrow;
var btn_diss;
var show_regs = true;
var simplifyConstants = true;

function main_asm() {
    console.log("Hello ASM");
    div_kernel_source = $("#kernel_source");
    div_kernel_asm = $("#kernel_asm");
    div_coderow = $("#coderow");
    btn_diss = $("#btn_diss");
    div_statsrow = $("#statsrow");
    /*
    $.getJSON("data/isa.json")
        .done(function (data) {
            console.log("ISA loaded");
            $("#isa_div").text(data.version);
            isa = data;

        })
        .fail(function () {
            console.error("Can't get isa!");
        });*/
    startup();
    LoadCallback();
}

function startup() {
    if (!is(program)) {
        Warn("Load a Program First!")
        btn_diss.prop("disabled", true);
        return;
    }
    btn_diss.removeAttr('disabled');
    //  $("#comp_div").text(program.ops);
    //  $("#dissas_div").text("Stub");
}

function ShowKernel(data) {
  
  
  function hi(ln){
let srcln = lines[ln][0];
let asmlineMin = lines[ln][1];
let asmlineMax = (ln+1 < lines.length ? lines[ln+1][1] : 500);
$("pre:eq( 0 )").attr('data-line', (srcln+1));
$("pre:eq( 1 )").attr('data-line', (asmlineMin+1)+'-'+(asmlineMax));
Prism.highlightElement($("code")[0]);
Prism.highlightElement($("code")[1]);
}
var a = 0;
var lines = decoded_data.lines;
var interval = setInterval(()=>{a = (a >= lines.length ? 0 : a+1); console.log(a, lines.length, lines[a]);hi(a);}, 1000);
  
    // ParseAsm(data.kernel.asm);
    div_coderow.empty();
    let blocks = [];

    if (data.source !== undefined) {
        blocks.push({ title: "kernel_source", text: data.source });
        // Prism.highlightElement(div_kernel_source[0]);
    } else {
        console.error("No kernel code!");
    }

    if (data.ops !== undefined) {
        blocks.push({ title: "kernel_asm", text: data.ops.reduce((p, c) => p += (c.op + " " + c.oa.join(" ")+"\n") , "") });
    }
    let bw = Math.floor(12.0 / blocks.length);
    for (let o of blocks) {
        let div = $("<div/>", { class: "col col-lg-" + Math.min(bw, o.fw || bw) });
        div.append($("<p>" + o.title + "</p>"));
        let pre = $("<pre/>").appendTo(div);
        let code = $("<code/>", { class: "language-C line-numbers" }).appendTo(pre);
        code.text(o.text);
        Prism.highlightElement(code[0]);
        div_coderow.append(div);
    }

    {
        let div = $("<div/>", { class: "col col-lg-4" });
        // div.text(JSON.stringify(data.kernel.asm.metrics));
        div_coderow.append(div);
    }

}

function ParseAsmFromRaw(asm) {
    let res = asm.split("\n");
    let obj = [];
    for (let o of res) {
        o = o.replace(/  +/g, ' ').replace(/(,| $|^ )/g, '');
        var opcode = o.substr(0, o.indexOf(" "));
        var operand = o.substr(o.indexOf(" ") + 1).split(" ");
        obj.push({ opcode: opcode, operand: operand });
    }
    return obj;
};


function Refresh() {
    ShowKernel(program);
}

function isRegister(str) {
    if (str.startsWith("0x")) {
        return false;
    }
    const regex = /^(v|s)(\d+|\[\d+\:\d+\])/g;
    if (regex.exec(str) !== null) {
        return true;
    }
    //not 100% sure
    return false;
}

function splitReg(str) {
    let split = str.indexOf(":");
    if (split == -1) {
        return false;
    }
    let end = str.length - 1;
    let min = parseInt(str.substring(2, split));
    let max = parseInt(str.substring(split + 1, end));
    let ret = [];
    for (let i = Math.min(min, max); i <= Math.max(min, max); i++) {
        ret.push(str[0] + i);
    }
    return ret;
}


function ParseAsm(asm) {
    asm.metrics = {};
    asm.metrics.NumVinsts = 0;
    asm.metrics.NumSinsts = 0;
    asm.metrics.NumMinsts = 0;
    asm.metrics.NumVregs = 0;
    asm.metrics.NumSregs = 0;
    asm.metrics.Numinsts = asm.instructions.length;
    asm.registers = {};
    let i = 0;
    for (let o of asm.instructions) {
        let isacode = isa.codes.find(function (e) {
            return e.opcode === o.opcode;
        });
        if (isacode !== undefined) {
            o.isaref = isacode;
            if (isacode.type == "s") {
                asm.metrics.NumSinsts++;
            } else if (isacode.type == "v") {
                asm.metrics.NumVinsts++;
            }
            if (isacode.r !== undefined) {
                o.registers = { w: [], r: [] };
                for (let rd of isacode.r) {
                    let reg = o.operand[rd];
                    if (isRegister(reg)) {
                        let split = splitReg(reg);
                        if (split) {
                            for (let rg of split) {
                                asm.registers[rg] = asm.registers[rg] || { r: [], w: [] };
                                asm.registers[rg].r.push(i);
                            }
                        } else {
                            asm.registers[reg] = asm.registers[reg] || { r: [], w: [] };
                            asm.registers[reg].r.push(i);
                        }
                    }
                }
            }
            if (isacode.w !== undefined) {
                for (let rd of isacode.w) {
                    let reg = o.operand[rd];
                    if (isRegister(reg)) {
                        let split = splitReg(reg);
                        if (split) {
                            for (let rg of split) {
                                asm.registers[rg] = asm.registers[rg] || { r: [], w: [] };
                                asm.registers[rg].w.push(i);
                            }
                        } else {
                            asm.registers[reg] = asm.registers[reg] || { r: [], w: [] };
                            asm.registers[reg].w.push(i);
                        }
                    }
                }
            }
        } else {
            console.warn("unknown isa opcode", o.opcode, o);
        }

        if (simplifyConstants) {
            for (oi = 0; oi < o.operand.length; oi++) {
                let opr = o.operand[oi];
                if (!isRegister(opr)) {
                    let int = parseInt(opr);
                    if (isNaN(int) || int + "" == opr) {
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
    for (let rg in asm.registers) {
        if (rg[0] === 's') {
            asm.metrics.NumSregs++;
        } else if (rg[0] === 'v') {
            asm.metrics.NumVregs++;
        }
    }
};
