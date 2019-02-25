import CodeEditor from "./module_CodeEditor.mjs";
import CorrelationTable from "./module_sourceCorrelate.mjs";

var btn_correlated;
clearInterval(interval);
var interval = undefined;

//only used for debug, this var shouldn't be referenced in code.
let _dataSet = {};

class Program {
    name = "";
    niceName = "";
    //LineCorralation Data
    lines = [];
    //Operations
    ops = [];
    //registerEventTicks
    rET = [];
    constructor() { }
}

class DataSet {
    //Source Code string
    source = "";
    programs = [];
    constructor() { }
}


$(document).ready(function () {
    console.log("hello world");
    div_main = $("#mainContainer");
    div_warn = $("#warn_bar");
    $("#compileBtn").click(CompileButton);
    $("#CompileTacAcceptBtn").click(CompileTacAccept);
    $("#correlatedLinesBtn").click(() => CodeEditor.enableCorrelation(btn_correlated.is(':checked')));
    main_asm();
});


function main_asm() {
    btn_correlated = $("#btn_correlated");
    btn_correlated.prop('disabled', true);
    PopulateSampleList();
    LoadSample("ocl_examples/sort.cl");
}


var acceptedTac = false;
function CompileButton() {
    if (acceptedTac) {
        return UploadSourceToServer();
    } else {
        $("#compileButton").prop("disabled", true);
        $("#compileTAC").show();
    }
}
function CompileTacAccept() {
    acceptedTac = true;
    $("#compileTAC").remove();
    $("#compileButton").prop("disabled", false);
    CompileButton();
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
function LoadSample(sampleUrl) {
    log("Loading sample " + sampleUrl);
    LoadProgram('data/' + sampleUrl, (SampleSource) => {
        let ds = new DataSet();
        ds.source = SampleSource;
        DisplayProgram(ds)
    });
}



function DisplayProgram(dataSet) {
    _dataSet = dataSet;


    if (dataSet.programs.length > 0 && dataSet.programs.some((pgrm) => { return pgrm.lines && pgrm.lines.length > 0; })) {
        btn_correlated.removeAttr('disabled');
        CorrelationTable.buildCorrelationTable(dataSet);
    } else {
        btn_correlated.prop('disabled', true);
    }

    let hasASM = dataSet.programs.some((pgrm) => (pgrm.ops !== undefined));
    CodeEditor.showKernel(dataSet);
    if (hasASM) {
        doChart();
        doChart2(dataSet);
    }
}




function HandleUploadResponse(serverResponse) {
    log("Upload Done, got Response");
    let reader = new FileReader();
    reader.addEventListener("loadend", function () {
        let decoedObj = msgpack.decode(new Uint8Array(reader.result));
        console.log(decoedObj);
        let newDS = new DataSet();
        newDS = Object.assign(newDS, decoedObj);
        log("Decoded server packet");
        //strip asic name for program name
        for (let pgrm of newDS.programs) {
            pgrm.niceName = pgrm.name.replace('gfx900_', '');
        };
        DisplayProgram(newDS);
    });
    try {
        reader.readAsArrayBuffer(serverResponse);
    } catch (e) {
        log("Can't Decode Results :(");
    }
}


function UploadSourceToServer() {
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
        error: (request, status, errorThrown) => logError("error " + request.status + " " + errorThrown, true),
    })
    aj.done(HandleUploadResponse);
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
function doChart2(dataSet) {
    $("#chart2").empty().html("<h4>ASM types</h4><svg/>")
    //TODO make server do this
    let types = {};
    for (let pgrm of dataSet.programs) {
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
        ["Bitonic Sort", "ocl_examples/sort.cl"]
    ],
    "Shader": []
};

function PopulateSampleList() {
    let div = $("#samplesForm");
    for (let typ in sampleFiles) {
        div.append('<h6 class="dropdown-header">' + typ + '</h6>');
        for (let fyl of sampleFiles[typ]) {
            let a = $('<li><a href="javascript:;" >' + fyl[0] + '</a></li>');
            a.click(() => LoadSample(fyl[1]));
            div.append(a);
        }
    }
}

window.DebugDump = function () {
    let dd = {
        "CorrelationTable": CorrelationTable.correlatedTable,
        "Dataset": _dataSet
    }
    console.info(dd);

}
