let div_kernel_source;

$(document).ready(function () {
    console.log("hello world");
    div_kernel_source = $("#kernel_source");
    $.getJSON("data/helloworld.program.json")
    .done(function (data) {
        ShowKernel(data)
    })
    .fail(function () {
        console.error("Can't get Program!");
    })


});

function ShowKernel(data) {
    if (data.kernel.source !== undefined) {
        div_kernel_source.text(data.kernel.source);
        Prism.highlightElement(div_kernel_source[0]);
    }else{
        console.error("No kernel code!");
    }
}