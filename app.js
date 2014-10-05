
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var teamMake = require('./routes/teamMake');
var http = require('http');
var path = require('path');

var app = express();
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
//app.get('/users', user.list);
//app.get('/teamMake', teamMake.mainView);
app.get('/teamMake', function(req, res){
     res.render('teamMake', { title: 'Qoo10FC 팀 편성'})
});

var httpServer = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// upgrate http server to scoekt.io server
var io = require('socket.io').listen(httpServer);
var userDict = []; // create empty array
var memberTable = [];
var qoo10MemberTable = ["김성주","김성두","이호경","이훈영","조윤상","김관태","조용덕","최지훈","이종화","권혁인","이형섭","방승혁","박현덕","박성호","김형철","박중민","이주인","구연우","설건호","조윤상","문호석","라인호"];
var gameMemberTable= [];
var seed1MemberTable = [];
var seed1MemberValueT = [];
var globalTeamCnt = 1;
var totalGameMemberCnt = 0;

io.sockets.on('connection', function(socket){
    socket.emit('firstAccess', {msg: socket.id});
    

    socket.on('MsgFromClient', function(data){
        socket.broadcast.emit('MsgFromServer', {msg:data.msg, name:searchUserName(data.id)});    // 자신 제외하고 다른 클라이언트에게 보냄
        socket.emit('MsgFromServer', {msg:data.msg, name:searchUserName(data.id)});  // 해당 클라이언트에게만 보냄.
    });

    
    // 시합 멤버 대상으로 추가
    socket.on('gameMemberListFromClient', function(data){
        if(!UserCheck(socket.id)) return; // 유저 체크
        var gameMemberList = [];
        for(var i in data.list) {            
            gameMemberList[i] = data.list[i].replace("ml_","") +":::" +qoo10MemberTable[data.list[i].replace("ml_","")];
        }
        // 게임 멤버 클라이언트로 푸시
         io.sockets.emit('gameMemberListToClient', {glist:Object.keys(gameMemberList).map( function(key){ return gameMemberList[key]; } ) } );
    });

    // 클라이언트로 부터 시합멤버 제거 리스트
   socket.on('deleteMemberListFromClient', function(data){
       if(!UserCheck(socket.id)) return; // 유저 체크
        var gameMemberList = [];
        for(var i in data.list) {            
            gameMemberList[i] = data.list[i].replace("ml_","") +":::" +qoo10MemberTable[data.list[i].replace("ml_","")];
        }
        // 게임 멤버 클라이언트로 푸시
         io.sockets.emit('delMemberListToClient', {glist:Object.keys(gameMemberList).map( function(key){ return gameMemberList[key]; } ) } );
    });

    
    socket.on('nameFromClient', function(data){
        var userDataArr = data.msg.split(":::");
        var accessNm = htmlEscape(userDataArr[0]);
        console.log(accessNm);
        userDict.push({
            name: accessNm,
            id: userDataArr[1]
        });
        
        //for(var i in userDict) { 
        //    console.log(userDict[i].name+":::"+userDict[i].id);
        //}
        memberTable[userDataArr[1]] = accessNm;
        
        io.sockets.emit('helloToClient', {msg:accessNm, id:userDataArr[1]});
        io.sockets.emit('sendToClientList', {users: Object.keys(memberTable).map( function(key){ return memberTable[key]; } ) });
        socket.emit('memberlistToClient', {list:Object.keys(qoo10MemberTable).map( function(key){ return qoo10MemberTable[key]; } ) } );
    });

    // 팀초기화 핸들러
    socket.on('teamMake3FromClient', function(data){
        if(!UserCheck(socket.id)) return; // 유저 체크
        seed1MemberTable = [];
        io.sockets.emit('teamMake3FromServer', {msg:data.msg});
    });

    // 시합 멤버 체크
    socket.on('selectedGameMemberFromClient', function(data){        
        // 나머지 멤버에게 게임멤버id push
        socket.broadcast.emit('gameMemberListFromServer', {id: data.id});
    });

    //-----------------------------------------------
    // teamMake0 처리
    //-----------------------------------------------
    socket.on('teamMake0FromClient', function(data){
        if(!UserCheck(socket.id)) return; // 유저 체크
        var teamNum = 0;
        totalGameMemberCnt = data.totalMember;
        console.log(data.totalMember);

        // 게임 참가 멤버가 선택 되지 않았을 때
        if(data.totalMember == 0){
            socket.emit('teamMake0err1FromServer', { num:data.totalMember});
        }
        else{
            // data.game_sanka_count가 8~14명이면 2팀, 15~21명 이상이면 3팀
            if(data.totalMember >= 8 && data.totalMember <= 14)
                teamNum = 2;
            else if(data.totalMember >= 15 && data.totalMember <= 21)
                teamNum = 3;
            else{
                socket.emit('teamMake0err2FromServer', { num:data.totalMember});
                return;
            }
            globalTeamCnt = teamNum;
            // 시합참가 멤버를 등록
            gameMemberTable = [];
            var name;
            for(i=0; i<data.list.length; i++){
                name  = data.list[i];
                gameMemberTable[qoo10MemberTable[name.replace("gl_","")]] = "0";
            }

            console.log(gameMemberTable);
            // 시합 그룹을 클라이언트로 푸쉬
            io.sockets.emit('drawingGroupFromServer', { msg:teamNum });
        }
    });

    //-----------------------------------------------
    // teamMake1 처리(시드배정)
    //-----------------------------------------------
    socket.on('teamMake1FromClient', function(data){
        if(!UserCheck(socket.id)) return; // 유저 체크
        var teamNum = 0;
        console.log(data.seedMember);

        // 게임 참가 멤버가 선택 되지 않았을 때
        if(data.seedMember == 0){
            socket.emit('teamMake1err1FromServer', { num:data.seedMember});
        }
        else{

             // 시합참가 멤버를 등록
            seed1MemberTable = [];  // 시드 사람들 배열
            
            
            //----------------------------------------
            // 램덤으로 그룹안에 사람들 배정
            //----------------------------------------
            var tempTable=[];   // 해당 그룹 배열
            for(var i in data.list) {                
                tempTable.push(randomGetMember(data.list.length, tempTable));
             }

            // 그룹갯수에 따라 사람들 배정되도록 함
            for(var i in tempTable) {                
                tempTable[i] = parseInt(tempTable[i]%globalTeamCnt);

            }

            var name;
            var jsonSeed1Member="";
            for(i=0; i<data.list.length; i++){
                name  = data.list[i];
                seed1MemberTable[qoo10MemberTable[name.replace("gl_","")]] = tempTable[i];
                jsonSeed1Member += String.format("\"{0}\":\"{1}\",",name, tempTable[i]);
            }
                   
            jsonSeed1Member = "{"+jsonSeed1Member.replace(/,$/i,"")+"}";

            console.log(jsonSeed1Member);

            // 시합 그룹의 멤버를 클라이언트로 푸쉬
            io.sockets.emit('drawingMemeberInGroupFromServer', { msg:jsonSeed1Member, count: totalGameMemberCnt});
        }
    });

    socket.on('disconnect',function(data){
        if( socket.id in memberTable){
            console.log("disconnect - " + socket.id);
            delete memberTable[socket.id];

            io.sockets.emit('goodbyToClient', { msg: searchUserName(socket.id) });
            io.sockets.emit('sendToClientList', {users: Object.keys(memberTable).map( function(key){ return memberTable[key]; } ) });
         }
    });

});

function searchUserName(id){
    var rtnName = "";
     for(var i in userDict) { 
         if(userDict[i].id == id)
             rtnName =  userDict[i].name;
      }
      return rtnName;
}

function randomGetMember(groupCnt, tempGroupTable){
   var i=0;
   var count=0;
   var forCount = 0;
   while(i<1){
        rdnNum = Math.floor((Math.random() * groupCnt) + 1);
        forCount = 0;
        count = 0;
        if(tempGroupTable.length == 0) break;
        for(j = 0; j<tempGroupTable.length; j++){
            if(tempGroupTable[j] == rdnNum) {
                count+=1;
            }
            forCount += 1;
        }
        console.log("length:"+tempGroupTable.length+", forcount:"+forCount);
        if(count == 0)
            i = 1;
        else if(count != 0 && tempGroupTable.length == forCount-1)
            i = 0;        

   }
    
    return rdnNum;
}


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

function htmlEscape(text) {
   return text.replace(/&/g, '&amp;').replace(/&amp;/g, '&amp;').
     replace(/</g, '&lt;').replace(/%3C/g, '&lt;').
     replace(/"/g, '&quot;').replace(/%22C/g, '&quot;').
     replace(/'/g, '&#039;').replace(/&#039/g, '&#039;').
     replace(/>/g, '&gt;').replace(/%3E/g, '&gt;');
}

function UserCheck(id){
    if(searchUserName(id) == "%EA%B9%80%ED%98%95%EC%B2%A0" || searchUserName(id) == "김형철") 
         return true;
    else if(searchUserName(id) == "%EC%9D%B4%ED%98%95%EC%84%AD" || searchUserName(id) == "이형섭")
        return true;
    else
        return false;
}