// 防止案Enter送出
$('#broadcastCard').on('keyup keypress', function (e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 13) {
        e.preventDefault();
        return false;
    }
});
$('#broadcastText').on('keyup keypress', function (e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 13) {
        e.preventDefault();
        return false;
    }
});

$('#sendReply').submit(function (e) {
    $.ajax({
        url: 'https://graph.facebook.com/' + $('#pageNameOption option:selected').val() + '/comments?access_token=EAAX4bcSCqgUBABeDZCrx2dqEihxB4JYXqxZApeZClZCNVOr6bFQZAM3uWUNGtPBbuRXYeg62x348loPRkZBCaKiy7DiVdceeIcVZCxjQqb1OoKaC4IW5njg1cJrzZAhPvf8DaDV7ZA0mE6mcTixu3i67BXxStLQmePrqD9nbXmM7vGAZDZD',
        type: 'post',
        data:
        {
            "message":$('#ReplyMessage').val()
        },
        success: function (result) {
            alert('回覆留言完成');
        }
    });


    e.preventDefault();
});
