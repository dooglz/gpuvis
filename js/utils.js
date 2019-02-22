var div_main;
var div_warn;
let isa = null;
let program = null;

const nop = function () { }

function Warn(str) {
    $("#warn_text").text(str);
    div_warn.show();
}

function log(text, fromserver = false) {
    console.log(text)
    $("#outputlogbox").append((fromserver ? "<b>" : "") + "<br>" + new Date().toLocaleTimeString() + ", "  + text + (fromserver ? "</b>" : ""));
}

function logError(text, fromserver = false) {
    console.error(text)
    $("#outputlogbox").append((fromserver ? "<b>" : "") + "<br><span class='errorLogEvent'>" + new Date().toLocaleTimeString() + ", "  + text + (fromserver ? "</span></b>" : ""));
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