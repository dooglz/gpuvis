var div_main;
var div_warn;
var program = null;

$(document).ready(function () {
    console.log("hello world");
    div_main = $("#mainContainer");
    div_warn = $("#warn_bar");
    // $(".pageselect .nav-item ").first().click();
    $(".pageselect .nav-item ")[0].click();
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

function LoadPage(page) {
    div_main.empty();
    div_warn.hide();
    page = "pages/" + page + ".html";
    console.log("Loading Page", page);
    div_main.load(page, function (responseTxt, statusTxt, xhr) {
        if (statusTxt == "success")
            console.log("External content loaded successfully!");
        if (statusTxt == "error")
            console.error("Error: " + xhr.status + ": " + xhr.statusText);
    });
}

function Warn(str) {
    $("#warn_text").text(str);
    div_warn.show();
}