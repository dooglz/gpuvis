var div_main;
var div_warn;
let isa = null;
let program = null;

const nop = function () { }

$(document).ready(function () {
    console.log("hello world");
    div_main = $("#mainContainer");
    div_warn = $("#warn_bar");
    main_asm();
});


var LoadCallback = nop;

function Warn(str) {
    $("#warn_text").text(str);
    div_warn.show();
}

function is(v) {
    let r = false;
    r |= (typeof v === "undefined");
    r |= (v === null);
    r |= (v === "");
    return !r;
}

function sigFigs(n, sig) {
    var mult = Math.pow(10, sig - Math.floor(Math.log(n) / Math.LN10) - 1);
    return Math.round(n * mult) / mult;
}

function updateProgress(evt) {
    if (evt.lengthComputable) {
      $("#output").text("Uploaded " + evt.loaded + " of " + evt.total + " bytes");
    }
  }