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


var result_data;
var decoded_data;
$("#filetypedropdown").prop("selectedIndex", -1);

function log(code, text, fromserver = false) {
  $("#errors").append((fromserver ? "<b>" : "") + "<br>" + new Date().toLocaleTimeString() + ", [" + code + "] " + text + (fromserver ? "</b>" : ""));
}

function UploadDone(data) {
  log("", "Upload Done, got Responce");
  result_data = data;
  var reader = new FileReader();
  reader.addEventListener("loadend", function () {
    decoded_data = msgpack.decode(new Uint8Array(reader.result));
    log("", "Decoded Result");
    program = decoded_data;
    $("#output").html(decoded_data.rET.length + " Register Events!<br>" + JSON.stringify(decoded_data).substr(0, 1024));
  });
  try{
    reader.readAsArrayBuffer(result_data);
  }catch(e){
    log("", "Can't Decode Results :(");
  }
}

function updateProgress(evt) {
  if (evt.lengthComputable) {
    $("#output").text("Uploaded " + evt.loaded + " of " + evt.total + " bytes");
  }
}

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
