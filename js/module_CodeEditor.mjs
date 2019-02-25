import CorrelationTable from "./module_sourceCorrelate.mjs";
let showCorrelation = false;
let ace_editors = [];
let markers_a = []
let markers_b = [];
//used to test if code in editor has been modified.
let originalSource = "";

//Have no clue why I have to do this:
let Range = ace.require("ace/range").Range;


export default class CodeEditor {
    static showAsmEditor(yesno) {
        console.log("bonk");
        privateBonk();
        
    }

    showSourceEditor(yesno) { }
    static enableCorrelation(yesno) {
        showCorrelation = yesno;
    }
    setSourceCode() { }
    setAsmCode() { }
    static getSourceCodeContent() {
        return ace_editors[0].getValue();
    }
    static showKernel(dataSet) {
        return _showKernel(dataSet);
    }
}

function _showKernel(dataSet) {
    const div_codeRow = $("#coderow").empty();

    let blocks = [];
    ace_editors = [];

    if (dataSet.source !== undefined) {
        blocks.push({ title: "kernel_source", text: dataSet.source });
        originalSource = dataSet.source;
    } else {
        console.error("No kernel source!");
    }

    let hasASM = false;
    let asmtext = "";
    for (let pgrm of dataSet.programs) {
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

    } else {
        console.info("program has no asm code");
        blocks.push({ title: "kernel_asm", text: "compile to see ASM" });
    }

    let bw = Math.floor(10.0 / blocks.length);
    for (let o of blocks) {
        let div = $("<div/>", { class: "col col-lg-" + Math.min(bw, o.fw || bw) });
        div.append($("<p>" + o.title + "</p>"));
        let pre = $('<div id="pre_' + o.title + '" class="editor"/>').appendTo(div);
        div_codeRow.append(div);
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


function CursorChange(baseEvent, editor) {
    //Clear all highlights
    markers_a.forEach((e) => { ace_editors[0].session.removeMarker(e); });
    markers_b.forEach((e) => { ace_editors[1].session.removeMarker(e); });
    markers_a = [];
    markers_b = [];
    //If We should show correlation 
    if (!showCorrelation || !editor || !editor.session) {
        return;
    }

    //Which editor did we just click in?
    const who = editor.session.tag;

    if (who === "kernel_source") {
        //cursor position
        const cp = ace_editors[0].selection.getAllRanges()[0];
        let asm = CorrelationTable.getCorrelatedAsm(cp.start.row, cp.end.row);
        console.info(1, cp, asm);
        //Is there any asm code associated with these source lines?
        if (asm !== undefined && asm.length > 0) {
            //Highlight each associated asm line
            asm.forEach((e) => {
                markers_b.push(ace_editors[1].session.addMarker(new Range(e.asmlineMin, 0, (e.asmlineMax), 200), "marker_row", "fullLine", true))
            });
        } else {
            console.info("no asm here");
            //Highlight source line red to indicate no asm.
            markers_a.push(ace_editors[0].session.addMarker(new Range(cp.start.row, 0, cp.end.row, 200), "marker_row_bad", "fullLine", true));
        }

    } else if (who === "kernel_asm") {
        //cursor position
        const cp = ace_editors[1].selection.getAllRanges()[0];
        let srcline = CorrelationTable.getCorrelatedSrc(cp.start.row, cp.end.row);
        console.info(2, cp, srcline);
        //Is there any source code associated with this asm (almost always yes, unless whitespace etc..)
        if (srcline !== undefined && srcline.length > 0) {
            //There could be more than one associated source line & we could have selected multiple asm lines.
            srcline.forEach((e) => {
                //Highlight this source line.
                markers_a.push(ace_editors[0].session.addMarker(new Range(e, 0, e, 200), "marker_row", "fullLine", true));
                //Mark other asm lines that point to this src:
                let asm = CorrelationTable.getCorrelatedAsm(e);
                if (asm !== undefined) {
                    asm.forEach((ea) => {
                        markers_b.push(ace_editors[1].session.addMarker(new Range(ea.asmlineMin, 0, (ea.asmlineMax), 200), "marker_row_alt", "fullLine", true))
                    });
                }
            });
        } else {
            console.info("no src here!");
            markers_b.push(ace_editors[1].session.addMarker(new Range(cp.start.row, 0, cp.end.row, 200), "marker_row_bad", "fullLine", true));
        }
    }
}


function SourceChanged() {
    if (ace_editors[0].getValue() === originalSource) {
        $("div.cover").remove();
        $("#compileBtn").prop("disabled", false);
    } else {
        $("#compileBtn").prop("disabled", true);
        if ($("div.cover").length == 0) {
            let cover = $("<div class=\"cover\"/>");
            cover.click(function (event) {
                event.stopPropagation();
            });
            ace_editors[1].container.appendChild(cover[0]);
        }
    }
}