String.format = function () {
    // The string containing the format items (e.g. "{0}")
    // will and always has to be the first argument.
    var theString = arguments[0];

    // start with the second argument (i = 1)
    for (var i = 1; i < arguments.length; i++) {
        // "gm" = RegEx options for Global search (more than one instance)
        // and for Multiline search
        var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
        theString = theString.replace(regEx, arguments[i]);
    }

    return theString;
}


function teamMakeStart(){
    // 기타 검증이 필요하면 여기서 정의
    var game_sanka_count = $("#memberView ul.gameOnList li").length;
}

function addMember(){

}

$(document).ready(function () {
    var severIdentityValue = "";
    var member_name = "";

    $("#m_name").focus();
   
    var socket = io.connect('http://localhost:3000');
    var inputMsg = "";
    $("#inputCommentArea textarea").keypress(function (e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if (code == 13) {
            // 이전 이벤트 실행 중지
            //e.preventDefault(); // 원래 이코드는 shift + enter들어오면 사용 하는 거 전 이벤트 상쇄
            if($("#add_comment_text").val().length > 0) {
                socket.emit('MsgFromClient', {msg: $("#add_comment_text").val(), id:severIdentityValue });
                $("#add_comment_text").val("");
            }
            return false;
        }
    });

    // 처음 이름 입력시
    $("#memberName input[type=text]").keypress(function(e){
        var code = (e.keyCode ? e.keyCode : e.which);
        if (code == 13) {
            if($("#m_name").val().length = 0 || $("#m_name").val() == "")
                  $("#memberName div.errorMsg").html("이름을 입력해주세요.");
            else{
                // 유저 이름 송신
                var userIdentity = encodeURI($("#m_name").val()) +":::"+ severIdentityValue;
                $("#m_name").val("");
                socket.emit('nameFromClient', {msg:userIdentity});
            }
            return false;
        }    
    });

    var chatListFormat = String.format("<li><span class=\"chatName\">{0} : </span><span class=\"chatMsg\">{1}</span></li>","Qoo10FC","팀편성에 오신것을 환영합니다.");
    
    
    socket.on('firstAccess', function(data){      
       
        //$("#chatArea ul.chatList").append(String.format("<li><span class=\"chatName\">{0} : </span><span class=\"chatMsg\">{1}</span></li>","Qoo10FC",data.msg));
        severIdentityValue = data.msg;
     });

    socket.on('sendToClientList', function(data){
         $("#chatMemberList ul.chatMemberNametList li").remove();
        var users = data.users;
        for(i=0; i<data.users.length; i++ ) {
            $("#chatMemberList ul.chatMemberNametList").append(String.format(" <li><span>{0}</span></li>",decodeURI(users[i])));
        }
     });

    socket.on('memberlistToClient', function(data){
        $("#div787").hide();
       $(".jqmOverlay").hide();
       $("#add_comment_text").focus();
        var users = data.list;
        for(i=0; i<data.list.length; i++ ) {
            $("#qoo10fcMemberList").append(String.format("<input type='checkbox' name='member_list' value='{0}' id='{0}'><label for='{0}'>&nbsp;{1}</label><br>", "ml_"+i, users[i]));
        }
     });

    // 게임 멤버 참가 리스트 표시
    socket.on('gameMemberListToClient', function(data){
        $("#memberView ul.gameOnList li").remove(); // 게임 멤버 리스트 초기화
        var users = data.glist;        
        for(i=0; i<data.glist.length; i++ ) {
               var userDataArr = users[i].split(":::");
            $("#memberView ul.gameOnList").append(String.format("<li id='{0}'>{2}.&nbsp;{1}</li>", "gl_"+userDataArr[0], userDataArr[1], parseInt(userDataArr[0])+1));
        }
        
     });

    socket.on('delMemberListToClient', function(data){
        var users = data.glist;        
        for(i=0; i<data.glist.length; i++ ) {
               var userDataArr = users[i].split(":::");
            $("#gl_"+userDataArr[0]).remove();
        }
     });

     socket.on('helloToClient', function(data){
        $("#chatArea ul.chatList").append(String.format("<li><span class=\"chatNameStart\" >- {0} 님이 접속 하셨습니다 -</li>",decodeURI(data.msg)));

     });

     socket.on('goodbyToClient', function(data){
        $("#chatArea ul.chatList").append(String.format("<li><span class=\"chatNameDiscon\" >- {0} 님이 퇴장 하셨습니다 -</li>",decodeURI(data.msg)));
        updateListSelection();
     });

    socket.on('MsgFromServer', function(data){        
        $("#chatArea ul.chatList").append(String.format("<li><span class=\"chatName\">{0} : </span><span class=\"chatMsg\">{1}</span></li>",decodeURI(data.name), data.msg));
        updateListSelection();
     });
        

    // 시합 멤버 등록
    $("#memberInsert").bind("click",function(e){
        e.preventDefault(); // 원래 이코드는 shift + enter들어오면 사용 하는 거 전 이벤트 상쇄
        if($("input[name=member_list]:checked").length == 0) {
            alert("시합 멤버를 선택해주세요."); return;
        }
        // 게임리스트에 있는지 체크        

        var gameMemberList = [];
        var gl_id = "";
       $("input[name=member_list]:checked").each(function(index, el){
             gameMemberList[index] = $(el).attr("id");            
       });
       socket.emit("gameMemberListFromClient", {list: gameMemberList });
    });

    // 시합 멤버 삭제
    $("#memberDelete").bind("click",function(e){
        e.preventDefault(); // 원래 이코드는 shift + enter들어오면 사용 하는 거 전 이벤트 상쇄
        if($("input[name=member_list]:checked").length == 0) {
            alert("제거할 멤버를 선택해주세요."); return;
        }

        var gameMemberList = [];
       $("input[name=member_list]:checked").each(function(index, el){
            gameMemberList[index] = $(el).attr("id");
       });
       socket.emit("deleteMemberListFromClient", {list: gameMemberList });
    });   
    
    // 시합 멤버 선택
    $("#memberView ul.gameOnList").on("click", "li", function(e){
        var jLiObj = e.target;

        $(jLiObj).toggleClass("selected");
        // 서버에 푸시
        socket.emit('selectedGameMemberFromClient',{id: $(jLiObj).attr("id")});
    }); 


    // 팀 그룹생성 클릭 바인드
    $("#teamMakeStart0").bind("click",function(e){
        e.preventDefault(); // 원래 이코드는 shift + enter들어오면 사용 하는 거 전 이벤트 상쇄
        if($("#teamArea div").length > 0) {alert('팀 그룹이 이미 생성되어졌습니다.'); return;}
        var $selectedGameMember = $("#memberView ul.gameOnList li");
         var game_sanka_count = $selectedGameMember.length;
        if(game_sanka_count == 0) {
            alert("시합 멤버가 등록 되지 않았습니다."); return;
        }

        var gameMemberList = [];
        $selectedGameMember.each(function(index, el){
                gameMemberList[index] = $(el).attr("id");            
        });
       socket.emit("teamMake0FromClient", {list: gameMemberList, totalMember: game_sanka_count });
    });

    // 시드1배정
    $("#teamMakeStart1").bind("click",function(e){
        e.preventDefault(); // 원래 이코드는 shift + enter들어오면 사용 하는 거 전 이벤트 상쇄
        if($("#teamArea div").length <= 0) {alert('팀 그룹을 먼저 생성해주세요.'); return;}
        var $selectedGameMember = $("#memberView ul.gameOnList li.selected");
         var seed = $selectedGameMember.length;
        if(seed == 0) {
            alert("시드선수가 선택 되지 않았습니다."); return;
        }

        var gameMemberList = [];
       $selectedGameMember.each(function(index, el){
             gameMemberList[index] = $(el).attr("id");            
       });
       socket.emit("teamMake1FromClient", {list: gameMemberList, seedMember: seed });
    });

    // 팀 초기화 send
    $("#teamMakeStart3").bind("click",function(e){
        e.preventDefault(); // 원래 이코드는 shift + enter들어오면 사용 하는 거 전 이벤트 상쇄
        if($("#teamArea div").length <= 0) {alert('팀 그룹을 먼저 생성해주세요.'); return;}    
        if($(".teamSelect dd").length <= 0) return;

       socket.emit("teamMake3FromClient", {msg:  $("#teamArea div").length});
    });

    socket.on('gameMemberListFromServer', function(data){
        $("#"+data.id).toggleClass("selected");
    });

    // 팀초기화 res
    socket.on('teamMake3FromServer', function(data){
        // 초기화 한 데이터는 동기화 필요하나?
        $(".teamSelect dd").remove();
        $("#memberList ul.gameOnList li a").remove();
    });

    // 그룹 만들기
    socket.on('drawingGroupFromServer', function(data){
        for(i=0; i<data.msg; i++) {
            var group = "<div class='teamSelect' id='ts{1}'><dl><dt>Group {0}</dt></dl></div>";
            group = String.format(group, changeToAlpa(i+1), i);
            $("#teamArea").append(group);
            $("div#ts"+i).delay(i*800).fadeIn(800);
        }
    });

    // 그룹안에 멤버 생성
    socket.on('drawingMemeberInGroupFromServer', function(data){
        var gameM =eval ("(" + data.msg + ")");
       
        var nameFormat = "<dd><span>{0}</span></dd>";
        for(i=0; i<$("div.teamSelect").length; i++){
            //$("div.teamSelect")[i]
            for(j=0; j<data.count; j++){
                if( i.toString() == eval("gameM.gl_"+j.toString())) {
                    //console.log("group_"+i.toString()+"  name:"+eval("$('#gl_"+j.toString()+"')").text());
                    $("<dd id='tgm"+j+"'>"+eval("$('#gl_"+j.toString()+"')").text()+"<dd>").appendTo("div#ts"+i);
                    $("div#ts"+i+" dd#tgm"+j+"").delay(j*900).fadeIn(800);
                    $("#memberView ul.gameOnList li#gl_"+j).append("<a href='javascript:return false;' class='button3'>완료</a>");
                }
            }
        }
    });


    //--------------------------
    // 서버측 에러 관련
    //--------------------------
    socket.on('teamMake0err1FromServer', function(data){
        alert('시합 멤버가 등록 되지 않았습니다.');
    });

    socket.on('teamMake0err2FromServer', function(data){
        alert('게임 참가수는 8명이상 21명 이하입니다.');
    });

    socket.on('teamMake1err1FromServer', function(data){
        alert('시드 선수가 선택 되지 않았습니다.');
    });

});

function updateListSelection() {
  //$("#chatArea").scrollTop($('ul#chatRealArea li:last').offset().top - 10000);
  $("#chatArea").scrollTop(100000);
};

function test4() {
    $("#selectDiv").toggle();
}

function allSelect(){
    $("#qoo10fcMemberList input[type=checkbox]").prop("checked",true)        
}

function allDeSelect(){
    $("#qoo10fcMemberList input[type=checkbox]").prop("checked",false)        
}

function changeToAlpa(num){
    var alpa = "";
    switch(num){
      case 1:
            alpa = "A"; break;
      case 2:
            alpa = "B"; break;
      case 3:
            alpa = "C"; break;
      case 3:
            alpa = "D"; break;
      default:
            alpa = "Z";break;
    }
    return alpa;
}