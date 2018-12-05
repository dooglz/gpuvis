function main_isa() {
    $.getJSON("/data/isa.json")
        .done(isa_Loadin)
        .fail(function () {
            console.error("Can't get isa!");
        });
    LoadCallback("isa");
}

var loaded_isa = undefined;

function isa_Loadin(data) {
    loaded_isa = data;
    console.log("isa loaded", loaded_isa);
    var table = $("<table/>");
    let collumnsText = ["opcode", "type", "ticks", "Reads", "Writes", "branch", "help"];
    let collumnsFeilds = ["o", "t", "c", "r", "w", "b", "h"];
    {
        var row = $("<tr/>");
        collumnsText.forEach((ea => {
            var cell = $("<td/>");
            cell.append(ea);
            row.append(cell);
        }));
        table.append(row);
    }

    loaded_isa.codes.forEach(element => {
        var row = $("<tr/>");
        collumnsFeilds.forEach((ea => {
            var cell = $("<td/>");
            cell.append(element[ea]);
            row.append(cell);
        }));
        table.append(row);
    });
    let div = $("#b1").append(table);
}

function isa_dload() {
    let data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(loaded_isa, 0, 4));
    let a = document.createElement('a');
    a.href = 'data:' + data;
    a.download = 'isa.json';
    a.innerHTML = 'download JSON';
    document.body.appendChild(a);
    a.click();
    a.remove()
}

function isa_dload_c() {
    let str = "";
    str += "//#define REGS(...) std::vector<uint8_t>({__VA_ARGS__})\n//#define OP(opcode, type, branch, ticks, help, r, w){ #opcode, opcode, type, branch, ticks, #help, r, w }\n\n"
    str += "enum OPCODE_TYPE { ";
    for (let ot in loaded_isa.optypes) {
        str += (ot + "=" + loaded_isa.optypes[ot] + ",");
    }
    str = str.slice(0, -1);
    str += " };\n\n"
    str += "enum ISAe {";
    loaded_isa.codes.forEach(element => {
        str += element.o + ",";
    });
    str = str.slice(0, -1);
    str += "};\n\nconst operation ISA[] = {\n";
    loaded_isa.codes.forEach(e => {
        str += "OP(" + e.o + ", " + e.t + ", " + e.b + ", " + e.c + "," + e.h + ", REGS(" + (e.r) + "), REGS(" + (e.w) + ")),\n";
    });
    str += "};";
    console.log(str);
    let data = "text/plain;charset=utf-8," + encodeURIComponent(str);
    let a = document.createElement('a');
    a.href = 'data:' + data;
    a.download = 'isa.h';
    a.innerHTML = 'download Headder';
    document.body.appendChild(a);
    a.click();
    a.remove()
}