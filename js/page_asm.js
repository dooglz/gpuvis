import CodeEditor from "./module_CodeEditor.mjs";
import CorrelationTable from "./module_sourceCorrelate.mjs";

var div_kernel_source;
var div_kernel_asm;

var div_statsrow;
var btn_diss;
var decoded_data;
var show_regs = true;
var simplifyConstants = true;
var Range = ace.require('ace/range').Range;
clearInterval(interval);
var interval = undefined;
var a = 0;
var toggleobj;

$(document).ready(function () {
    console.log("hello world");
    div_main = $("#mainContainer");
    div_warn = $("#warn_bar");
    $("#compileBtn").click(CompileButton);
    $("#CompileTacAcceptBtn").click(CompileTacAccept);
    $("#correlatedLinesBtn").click(()=>CodeEditor.enableCorrelation(!btn_diss.is(':checked')));
    main_asm();
});


function main_asm() {
   // AceEditors.showAsmEditor();
    div_kernel_source = $("#kernel_source");
    div_kernel_asm = $("#kernel_asm");

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
        CorrelationTable.buildCorrelationTable();
    }

    let hasASM = decoded_data.programs.some((pgrm)=>(pgrm.ops !== undefined));
    CodeEditor.showKernel(program);
    if(hasASM){
        doChart();
        doChart2();
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
    var content = CodeEditor.getSourceCodeContent();
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
    
    let chartdata = CorrelationTable.getD3formatted();

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

