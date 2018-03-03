var div_kernel_source;
var div_kernel_asm;
var isa;
var program;
$(document).ready(function () {
    console.log("hello world");
    div_kernel_source = $("#kernel_source");
    div_kernel_asm = $("#kernel_asm");

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
    if (data.kernel.source !== undefined) {
        div_kernel_source.text(data.kernel.source);
        Prism.highlightElement(div_kernel_source[0]);
    }else{
        console.error("No kernel code!");
    }
    if(data.kernel.asm.instructions !== undefined){
        let str = "";
        for (let o of data.kernel.asm.instructions) {
            str += o.opcode + "\t\t" + o.operand.join(" ")+ "\n";
        }
        div_kernel_asm.text(str);
        Prism.highlightElement(div_kernel_asm[0]);
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

function ParseAsm(asm) {
    asm.metrics = {};
    asm.metrics.NumVgprs =0;
    asm.metrics.NumSgprs =0;
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
        }else{
            console.warn("unknown isa opcode",o.opcode,o);
        }
    }
};
