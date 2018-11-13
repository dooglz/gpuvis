var div_main;
var div_warn;
let isa = null;
let program = null;
const nop = function () {
}

$(document).ready(function () {
    console.log("hello world");
    div_main = $("#mainContainer");
    div_warn = $("#warn_bar");
    // $(".pageselect .nav-item ").first().click();
    //$(".pageselect .nav-item ")[0].click();

    skip(2);
});

$(".pageselect .nav-item").each(function () {
    if ($(this).children().data("page")) {
        $(this).on("click", function () {
            $(".navbar").find(".active").removeClass("active");
            $(this).addClass("active");
            LoadPage($(this).children().data("page"));
        });
    } else {
        $(this).addClass("disabled");
    }
});

let LoadCallback = nop;
let ActivePage;
function ReloadPage() {
    LoadPage(ActivePage, () => { });
}
function LoadPage(page, extracallback) {
    extracallback = (extracallback ? extracallback : nop);
    div_warn.hide();
    page = "pages/" + page + ".html";
    console.log("Loading Page", page);
    LoadCallback = ((page) => {
        extracallback();
        ActivePage = page;
        LoadCallback = nop;
    });
    div_main.load(page, function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success")
            console.log(page, "External content loaded successfully!");
        if (statusTxt == "error") {
            console.error(page, "Error: " + xhr.status + ": " + xhr.statusText);
            LoadCallback = nop;
        }
    });
}

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

function skip(to, stage) {
    stage = (stage ? stage : 0);
    console.log("skip", to, stage);
    switch (stage) {
        case 0:
            LoadPage("loader", () => {
                skip(to, 1);
            });
            break;
        case 1:
            if (to < 1) {
                return;
            }
            //LoadProgram('data/helloworld.program.json', () => {
            skip(to, 2)
            // });
            break;
        case 2:
            if (to < 2) {
                return;
            }
            LoadPage("asm", () => {
                skip(to, 3)
            });
            break;
        case 3:
            if (to < 3) {
                return;
            }
            LoadPage("sim")
            break;
    }
}

