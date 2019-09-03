$.ajax({
    url: "https://graph.facebook.com/154101175170134/conversations?access_token=EAAX4bcSCqgUBAG0mZBWKtZCnE2zh9ZBVgfWIt56JQX87vEWsZCSqEnIAzMnmGOJKGqWWVRqZAICsLuD2Uv6xrJcsoP1VdhBKmLA8jtJSoGNEZBX1z6RQWIS0bSWxelKTmM2Puk9BGIRxD1pZCej8jle4ZAuaSOwF7kU7g8En7COopwZDZD",
    type: 'get',
    success: function (data) {
        $('select[name=pageName] option:eq(1)').text("王子杰(" + data.data[0].unread_count + ")");

        var Messages = data.data[0].messages.data;
        Messages.map(function (MessageData) {
            var mid = MessageData.id;
            $.ajax({
                url: "https://graph.facebook.com/v2.10/" + mid + "?access_token=EAAX4bcSCqgUBAG0mZBWKtZCnE2zh9ZBVgfWIt56JQX87vEWsZCSqEnIAzMnmGOJKGqWWVRqZAICsLuD2Uv6xrJcsoP1VdhBKmLA8jtJSoGNEZBX1z6RQWIS0bSWxelKTmM2Puk9BGIRxD1pZCej8jle4ZAuaSOwF7kU7g8En7COopwZDZD&fields=message,from,created_time",
                type: 'get',
                success: function (result) {
                    if(result.from.name == "王子杰"){
                    var HtmlRowData = "<tr>";
                    HtmlRowData += "<td>" + result.from.name + "</td>";
                    HtmlRowData += "<td>" + result.message + "</td>";
                    HtmlRowData += "<td>" + result.created_time.replace("T", " ").replace("+0000", "") + "</td>";
                    HtmlRowData += "</tr>";
                    $('#grid-basic tbody').append(HtmlRowData);
                    }
                    // if(Messages.indexOf(MessageData) == Messages.length -1){
                    //     $("#grid-basic").bootgrid();
                    //     $("#gridContent").css("display", "block");
                    //     $(".actionBar").css("display", "none");
                    // }
                }
            })
        })
    }
})
setTimeout(function(){
    $("#grid-basic").bootgrid();
    $("#gridContent").css("display", "block");
    $(".actionBar").css("display", "none");
}, 1000)