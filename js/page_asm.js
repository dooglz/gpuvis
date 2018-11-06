var div_kernel_source;
var div_kernel_asm;
var div_coderow;
var div_statsrow;
var btn_diss;
var show_regs = true;
var simplifyConstants = true;
var Range = ace.require('ace/range').Range;

function main_asm() {
    console.log("Hello ASM");
    div_kernel_source = $("#kernel_source");
    div_kernel_asm = $("#kernel_asm");
    div_coderow = $("#coderow");
    btn_diss = $("#btn_diss");
    div_statsrow = $("#statsrow");
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
    ShowKernel(program);
    //  $("#comp_div").text(program.ops);
    //  $("#dissas_div").text("Stub");
}

var interval, a;
var marker_a, marker_b;
function Corralated() {
    clearInterval(interval);
    function hi(ln) {
        if(lines.length <= ln){return;}
        let srcln = lines[ln][0];
        let asmlineMin = lines[ln][1]; 
        let asmlineMax = (ln + 1 < lines.length ? lines[ln + 1][1] : 500);

        srcln --;
        asmlineMin = Math.max(asmlineMin--, 0);
        asmlineMax = Math.max(asmlineMax--, 0);

        console.log(a, srcln,asmlineMin, asmlineMax);
        ace_editors[0].session.removeMarker(marker_a);
        ace_editors[1].session.removeMarker(marker_b);
        marker_a = ace_editors[0].session.addMarker(new Range(srcln, 0, srcln, 200), "marker_row", "fullLine", true);
        marker_b = ace_editors[1].session.addMarker(new Range(asmlineMin, 0, (asmlineMax), 200), "marker_row", "fullLine", true);
        //  $("pre:eq( 0 )").attr('data-line', (srcln + 1));
        //  $("pre:eq( 1 )").attr('data-line', (asmlineMin + 1) + '-' + (asmlineMax));
        // Prism.highlightElement($("code")[0]);
        //  Prism.highlightElement($("code")[1]);
    }
    a = 0;
    var lines = decoded_data.lines;
    interval = setInterval(() => { a = (a >= lines.length ? 0 : a + 1); hi(a); }, 1000);
}

function ShowKernel(data) {
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
        blocks.push({ title: "kernel_asm", text: data.ops.reduce((p, c) => p += (c.op + " " + c.oa.join(" ") + "\n"), "") });
    } else {
        console.error("No asm code!");
    }
    let bw = Math.floor(12.0 / blocks.length);



    for (let o of blocks) {
        let div = $("<div/>", { class: "col col-lg-" + Math.min(bw, o.fw || bw) });
        div.append($("<p>" + o.title + "</p>"));
        let pre = $('<div id="pre_' + o.title + '" class="editor"/>').appendTo(div);
        // pre.html(o.text);
        div_coderow.append(div);
        editor = ace.edit(pre[0]);
        editor.setTheme("ace/theme/github");
        editor.session.setMode("ace/mode/c_cpp");
        editor.setValue(o.text);
        ace_editors.push(editor);
        //let code = $('<code contenteditable="true" id="code_'+o.title+'"/>', { class: "language-C line-numbers" }).appendTo(pre);
        //code.text(o.text);
        //  Prism.highlightElement(code[0]);

    }

    {
        let div = $("<div/>", { class: "col col-lg-4" });
        // div.text(JSON.stringify(data.kernel.asm.metrics));
        div_coderow.append(div);
    }
}

var ace_editors = [];

function uploadFile() {
    log("", "uploading " + $("#file")[0].value);
    var file_data = new FormData(document.getElementById('filename'));
    var aj = $.ajax({
        url: "/upload",
        type: "POST",
        data: file_data,
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
        error: (request, status, errorThrown) => log(request.status, errorThrown, true),
    })
    aj.done(UploadDone);
    return false;
}
