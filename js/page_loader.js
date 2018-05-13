function main_loader() {
    console.log("Hello loader");
    LoadCallback();
}

function LoadProgram(pgrm,callback){
    $.getJSON(pgrm)
        .done(function (data) {
            $("#div_pgrm").text(data.name);
            program = data;
            console.log("pgrm: ",pgrm, " Loaded")
            callback(true);
        })
        .fail(function () {
            console.error("Can't get Program!");
        });
}