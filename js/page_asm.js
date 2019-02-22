import AceEditors from "./module_ace_editors.mjs";

var div_kernel_source;
var div_kernel_asm;
var div_coderow;
var div_statsrow;
var btn_diss;
var decoded_data;
var show_regs = true;
var simplifyConstants = true;
var Range = ace.require('ace/range').Range;
clearInterval(interval);
var interval = undefined;
var a = 0;
var markers_a = []
var markers_b = [];
var ace_editors = [];
var correlatedTable = [];
var toggleobj;

$(document).ready(function () {
    console.log("hello world");
    div_main = $("#mainContainer");
    div_warn = $("#warn_bar");
    $("#compileBtn").click(CompileButton);
    $("#CompileTacAcceptBtn").click(CompileTacAccept);
    $("#correlatedLinesBtn").click(CursorChange);
    main_asm();
});


function main_asm() {
    AceEditors.showAsmEditor();
    div_kernel_source = $("#kernel_source");
    div_kernel_asm = $("#kernel_asm");
    div_coderow = $("#coderow");
    btn_diss = $("#btn_diss");
    div_statsrow = $("#statsrow");
    toggleobj = btn_diss.bootstrapToggle();
    PopulateSampleList();
    startup();
}


var acceptedTac = false;
function CompileButton() {
    if (acceptedTac) {
        return Compile();
    } else {
        $("#compileButton").prop("disabled", true);
        $("#compileTAC").show();
    }
}
function CompileTacAccept() {
    acceptedTac = true;
    $("#compileTAC").remove();
    $("#compileButton").prop("disabled", false);
    Compile();
}

function LoadProgram(pgrm, callback) {
    $.get(pgrm, 'text')
        .done(function (data) {
            console.log("pgrm: ", pgrm, " Loaded")
            callback(data);
        })
        .fail(function () {
            console.error("Can't get Program!");
        });
}


function startup() {
    if (!is(program)) {
        decoded_data = {};
        decoded_data.programs = [];
        program = decoded_data;
        LoadProgram('data/sort.cl.txt', (d) => {
            decoded_data.source = d;
            startup();
        });
        return;
    }

    btn_diss.removeAttr('disabled');

    if (decoded_data.programs.length > 0) {
        correlatedTable = [];
        let myOffset = 3;
        for (let pgrm of program.programs) {
            const lastline = pgrm.ops.length;
            for (let i = 0; i < pgrm.lines.length; i++) {
                let srcline = pgrm.lines[i][0];
                let asmlineMin = pgrm.lines[i][1];
                let asmlineMax = (i + 1 < pgrm.lines.length ? pgrm.lines[i + 1][1] - 1 : lastline);
                srcline--;
                asmlineMin = Math.max(asmlineMin--, 0);
                asmlineMax = Math.max(asmlineMax--, 0);
                correlatedTable[srcline] = correlatedTable[srcline] ? correlatedTable[srcline] : [];
                correlatedTable[srcline].push({ asmlineMin: (asmlineMin + myOffset), asmlineMax: (asmlineMax + myOffset) });
            }
            myOffset += (pgrm.ops.length + 3);
        }
    }
    ShowKernel(program);
}


function getCorrelatedAsm(srcline_start, srcline_end) {
    if (srcline_end === undefined) { srcline_end = srcline_start; }
    let lines = [];
    for (let index = srcline_start; index <= srcline_end; index++) {
        const element = correlatedTable[index];
        if (element === undefined) { continue; }
        lines = lines.concat(element);
    }
    return lines;
}

function getCorrelatedSrc(asmLine_start, asmLine_end) {
    if (asmLine_end === undefined) { asmLine_end = asmLine_start; }
    let indexes = [];
    correlatedTable.forEach(
        (e, i) => {
            if (e == undefined) { return false; }
            if (
                e.find((range) => {
                    return range.asmlineMin <= asmLine_end && range.asmlineMax >= asmLine_start;
                })
            ) {
                indexes.push(i);
            }
        }
    );
    return indexes;
}

function ShowKernel(data) {
    div_coderow.empty();
    let blocks = [];
    ace_editors = [];

    if (data.source !== undefined) {
        blocks.push({ title: "kernel_source", text: data.source });
    } else {
        console.error("No kernel source!");
    }

    let hasASM = false;
    let asmtext = "";
    for (let pgrm of data.programs) {
        if (pgrm.ops === undefined) {
            console.error("No kernel asm!", pgrm);
        } else {
            hasASM = true;
            asmtext += "\n--------- " + pgrm.niceName + " --------\n\n";
            asmtext += pgrm.ops.reduce((p, c) => p += (c.op + " " + c.oa.join(" ") + "\n"), "");
        }
    }

    if (hasASM) {
        blocks.push({ title: "kernel_asm", text: asmtext });
        doChart();
        doChart2();
    } else {
        console.info("program has no asm code");
        blocks.push({ title: "kernel_asm", text: "compile to see ASM" });
    }

    let bw = Math.floor(10.0 / blocks.length);
    for (let o of blocks) {
        let div = $("<div/>", { class: "col col-lg-" + Math.min(bw, o.fw || bw) });
        div.append($("<p>" + o.title + "</p>"));
        let pre = $('<div id="pre_' + o.title + '" class="editor"/>').appendTo(div);
        div_coderow.append(div);
        let editor = ace.edit(pre[0]);
        editor.tag = o.title;
        editor.session.tag = o.title;
        editor.setTheme("ace/theme/github");
        editor.session.setMode("ace/mode/c_cpp");
        editor.session.setOptions({ wrap: false });
        editor.setValue(o.text, 1);
        editor.selection.on("changeCursor", CursorChange);
        ace_editors.push(editor);
    }

    //src editor
    ace_editors[0].session.doc.on("change", SourceChanged);
    //asm editor
    ace_editors[1].setOptions({ readOnly: true });
}


function CursorChange(a, b) {
    //Clear all highlights
    console.info(456);
    markers_a.forEach((e) => { ace_editors[0].session.removeMarker(e); });
    markers_b.forEach((e) => { ace_editors[1].session.removeMarker(e); });
    markers_a = [];
    markers_b = [];
    if (!btn_diss.is(':checked') || !b || !b.session) {
        return;
    }
    console.info(1234);
    const who = b.session.tag;

    const cp0 = ace_editors[0].selection.getAllRanges()[0];
    const cp1 = ace_editors[1].selection.getAllRanges()[0];

    if (who === "kernel_source") {
        let asm = getCorrelatedAsm(cp0.start.row, cp0.end.row);
        console.info(1, cp0, cp1, asm);
        if (asm !== undefined && asm.length > 0) {
            asm.forEach((e) => {
                markers_b.push(ace_editors[1].session.addMarker(new Range(e.asmlineMin, 0, (e.asmlineMax), 200), "marker_row", "fullLine", true))
            });
        } else {
            console.info("no asm here");
            markers_a.push(ace_editors[0].session.addMarker(new Range(cp0.start.row, 0, cp0.end.row, 200), "marker_row_bad", "fullLine", true));
        }
    } else if (who === "kernel_asm") {

        let srcline = getCorrelatedSrc(cp1.start.row, cp1.end.row);
        console.info(2, cp0, cp1, srcline);
        if (srcline !== undefined && srcline.length > 0) {
            srcline.forEach((e) => {
                markers_a.push(ace_editors[0].session.addMarker(new Range(e, 0, e, 200), "marker_row", "fullLine", true));
                //mark other asm lines that point to this src:
                let asm = getCorrelatedAsm(e);
                if (asm !== undefined) {
                    asm.forEach((ea) => {
                        markers_b.push(ace_editors[1].session.addMarker(new Range(ea.asmlineMin, 0, (ea.asmlineMax), 200), "marker_row_alt", "fullLine", true))
                    });
                }
            });
        } else {
            console.info("no src here!");
            markers_b.push(ace_editors[1].session.addMarker(new Range(cp1.start.row, 0, cp1.end.row, 200), "marker_row_bad", "fullLine", true));
        }
    }
}

function SourceChanged() {
    if (ace_editors[0].getValue() === decoded_data.source) {
        $("div.cover").remove();
        toggleobj.bootstrapToggle('enable');
        toggleobj.bootstrapToggle('on');
    } else {
        toggleobj.bootstrapToggle('off');
        toggleobj.bootstrapToggle('disable');
        var cover = $("<div class=\"cover\"/>");
        cover.click(function (event) {
            event.stopPropagation();
        });
        ace_editors[1].container.appendChild(cover[0]);
    }
}

function UploadDone2(data) {
    log("Upload Done, got Response");
    let result_data = data;
    var reader = new FileReader();
    reader.addEventListener("loadend", function () {
        decoded_data = msgpack.decode(new Uint8Array(reader.result));
        log("Decoded server packet");
        program = decoded_data;

        for (let pgrm of program.programs) {
            pgrm.niceName = pgrm.name.replace('gfx900_', '');
        }
        startup();
    });
    try {
        reader.readAsArrayBuffer(result_data);
    } catch (e) {
        log("Can't Decode Results :(");
    }
}

function Compile() {
    log("uploading code");
    //var file_data = new FormData(document.getElementById('filename'));
    let formData = new FormData();
    formData.append("filetype", $("#codetypedropdown").val());
    // JavaScript file-like object
    var content = ace_editors[0].getValue()
    var blob = new Blob([content], { type: "text/xml" });
    formData.append("inputfile", blob)

    var aj = $.ajax({
        url: "/upload",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        cache: false,
        xhrFields: {
            responseType: 'blob'
        },
        xhr: function () {
            let myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) {
                myXhr.upload.addEventListener('progress', updateProgress, false);
            }
            return myXhr;
        },
        error: (request, status, errorThrown) => logError("error " + request.status + " " + errorThrown, true),
    })
    aj.done(UploadDone2);
    return false;
}




var chart1;
function doChart() {
    $("#chart1").empty().html("<h4>Number of ASM ops per Source Line</h4><svg/>")
    //Keys are Src line, values are number of correlated asm lines.
    let chartdata = correlatedTable.map((e) => {
        return e.reduce((ea, cv) => ea += (cv.asmlineMax - cv.asmlineMin), 0)
    })
    //Array of {id: src, value: asmcount}
    chartdata = (chartdata.map((e, i) => ({ id: (i + 1), value: e }))).filter(e => e);
    chart1 = new d3_barchart($("#chart1 svg"), chartdata);
}
var chart2;
function doChart2() {
    $("#chart2").empty().html("<h4>ASM types</h4><svg/>")
    //TODO make server do this
    let types = {};
    for (let pgrm of program.programs) {
        pgrm.ops.forEach((e) => {
            let t = e.op[0];
            if (!types[t]) { types[t] = 0; }
            types[t]++;
        });
    }
    let dataArray = [];
    Object.keys(types).forEach((e) => { dataArray.push({ id: e, value: types[e] }) })

    chart2 = new d3_piechart($("#chart2 svg"), dataArray);
}


const sampleFiles = {
    "OpenCL": [
        ["Simple Kernel", "ocl_examples/simple1.cl"],
        ["ImageSample", "ocl_examples/imagesample.cl"],
        ["nbody Unrolled", "ocl_examples/nbody_unroll.cl"],
        ["Reduction", "ocl_examples/reduction.cl"],
    ],
    "Shader": []
};

function PopulateSampleList() {
    let div = $("#samplesForm");
    for (let typ in sampleFiles) {
        div.append('<h6 class="dropdown-header">' + typ + '</h6>');
        for (let fyl of sampleFiles[typ]) {
            let a = $('<li><a href="javascript:;" >' + fyl[0] + '</a></li>');
            a.click(()=>LoadSample(fyl[1]));
            div.append(a);
        }
    }


}

function LoadSample(sampleUrl) {
    log("Loading sample " + sampleUrl);
    LoadProgram('data/'+sampleUrl,()=>{});
}

