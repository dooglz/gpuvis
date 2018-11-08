var div_kernel_source;
var div_kernel_asm;
var div_coderow;
var div_statsrow;
var btn_diss;
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

function main_asm() {
    console.log("Hello ASM");
    div_kernel_source = $("#kernel_source");
    div_kernel_asm = $("#kernel_asm");
    div_coderow = $("#coderow");
    btn_diss = $("#btn_diss");
    div_statsrow = $("#statsrow");
    toggleobj = btn_diss.bootstrapToggle();
    LoadCallback("asm");
    startup();
}

function startup() {
    if (!is(program)) {
        Warn("Load a Program First!")
        btn_diss.prop("disabled", true);
        return;
    }
    btn_diss.removeAttr('disabled');

    if (decoded_data.lines) {
        correlatedTable = [];
        for (let i = 0; i < decoded_data.lines.length; i++) {
            let srcline = decoded_data.lines[i][0];
            let asmlineMin = decoded_data.lines[i][1];
            let asmlineMax = (i + 1 < decoded_data.lines.length ? decoded_data.lines[i + 1][1] - 1 : 1000);
            srcline--;
            asmlineMin = Math.max(asmlineMin--, 0);
            asmlineMax = Math.max(asmlineMax--, 0);
            correlatedTable[srcline] = correlatedTable[srcline] ? correlatedTable[srcline] : [];
            correlatedTable[srcline].push({ asmlineMin: asmlineMin, asmlineMax: asmlineMax });
        }
    }
    ShowKernel(program);
}


function getCorrelatedAsm(srcline) {
    return correlatedTable[srcline];
}
function getCorrelatedSrc(asmLine) {
    return correlatedTable.findIndex((e) => {
        if (e == undefined) { return false; }
        return e.find((range) => {
            return range.asmlineMin <= asmLine && range.asmlineMax >= asmLine;
        }
        )
    });
}

function ShowKernel(data) {
    div_coderow.empty();
    let blocks = [];
    ace_editors = [];
    if (data.source !== undefined) {
        blocks.push({ title: "kernel_source", text: data.source });
    } else {
        console.error("No kernel code!");
    }
    if (data.ops !== undefined) {
        blocks.push({ title: "kernel_asm", text: data.ops.reduce((p, c) => p += (c.op + " " + c.oa.join(" ") + "\n"), "") });
    } else {
        console.error("No asm code!");
    }
    let bw = Math.floor(10.0 / blocks.length);
    for (let o of blocks) {
        let div = $("<div/>", { class: "col col-lg-" + Math.min(bw, o.fw || bw) });
        div.append($("<p>" + o.title + "</p>"));
        let pre = $('<div id="pre_' + o.title + '" class="editor"/>').appendTo(div);
        div_coderow.append(div);
        editor = ace.edit(pre[0]);
        editor.tag = o.title;
        editor.session.tag = o.title;
        editor.setTheme("ace/theme/github");
        editor.session.setMode("ace/mode/c_cpp");
        editor.setValue(o.text, 1);
        ace_editors.push(editor);
    }
    ace_editors[0].session.setOptions({ wrap: false });
    ace_editors[1].session.setOptions({ wrap: false });
    ace_editors[1].setOptions({ readOnly: true });
    ace_editors[0].selection.on("changeCursor", CursorChange);
    ace_editors[1].selection.on("changeCursor", CursorChange);
    ace_editors[0].session.doc.on("change", SourceChanged);
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
    const cp0 = ace_editors[0].selection.getCursor().row;
    const cp1 = ace_editors[1].selection.getCursor().row;
    if (who === "kernel_source") {
        console.info(1, cp0, cp1);
        let asm = getCorrelatedAsm(cp0);
        if (asm !== undefined) {
            asm.forEach((e) => {
                markers_b.push(ace_editors[1].session.addMarker(new Range(e.asmlineMin, 0, (e.asmlineMax), 200), "marker_row", "fullLine", true))
            });
        } else {
            markers_a.push(ace_editors[0].session.addMarker(new Range(cp0, 0, cp0, 200), "marker_row_bad", "fullLine", true));
        }
    } else if (who === "kernel_asm") {
        console.info(2);
        let srcline = getCorrelatedSrc(cp1);
        if (srcline !== undefined) {
            markers_a.push(ace_editors[0].session.addMarker(new Range(srcline, 0, srcline, 200), "marker_row", "fullLine", true));
            //mark other asm lines that point to this src:
            let asm = getCorrelatedAsm(srcline);
            if (asm !== undefined) {
                asm.forEach((e) => {
                    markers_b.push(ace_editors[1].session.addMarker(new Range(e.asmlineMin, 0, (e.asmlineMax), 200), "marker_row", "fullLine", true))
                });
            }
        } else {
            markers_b.push(ace_editors[1].session.addMarker(new Range(cp1, 0, cp1, 200), "marker_row_bad", "fullLine", true));
        }
    }
}

function SourceChanged() {
    if (ace_editors[0].getValue() === decoded_data.source) {
        $("div.cover").remove();
        toggleobj.bootstrapToggle('enable');
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
    log("", "Upload Done, got Response");
    result_data = data;
    var reader = new FileReader();
    reader.addEventListener("loadend", function () {
        decoded_data = msgpack.decode(new Uint8Array(reader.result));
        log("", "Decoded Result");
        program = decoded_data;
        startup();
    });
    try {
        reader.readAsArrayBuffer(result_data);
    } catch (e) {
        log("", "Can't Decode Results :(");
    }
}

function Compile() {
    log("", "uploading code");
    //var file_data = new FormData(document.getElementById('filename'));
    let formData = new FormData();
    formData.append("filetype", "OCL_SOURCE");
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
            myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) {
                myXhr.upload.addEventListener('progress', updateProgress, false);
            }
            return myXhr;
        },
        error: (request, status, errorThrown) => log(request.status, "error " + request.status + " " + errorThrown, true),
    })
    aj.done(UploadDone2);
    return false;
}


function log(code, text, fromserver = false) {
    $("#errors").append((fromserver ? "<b>" : "") + "<br>" + new Date().toLocaleTimeString() + ", [" + code + "] " + text + (fromserver ? "</b>" : ""));
}