function main_loader() {
    console.log("Hello loader");
}

function LoadProgram(pgrm){
    $.getJSON(pgrm)
        .done(function (data) {
            $("#div_pgrm").text(data.name);
            program = data;
        })
        .fail(function () {
            console.error("Can't get Program!");
        });
}