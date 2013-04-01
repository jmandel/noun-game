angular.module('nounGame', ['ngResource'], function($routeProvider, $locationProvider){

  $routeProvider.when('/play/pick-game', {
    templateUrl:'/static/noun-game/templates/pick-game.html',
    controller: 'PickRoomController'
  }) 

  $routeProvider.when('/play/game/:gid', {
    templateUrl:'/static/noun-game/templates/index.html',
    controller: 'InputController'
  }) 

  $routeProvider.when('/play/ready-to-start', {
    templateUrl:'/static/noun-game/templates/ready.html',
    controller: 'ReadyController'
  }) 

  $routeProvider.otherwise({
    redirectTo: '/play/pick-game'
  }) 

  $locationProvider.html5Mode(true);
  console.log("Started module");
});

angular.module('nounGame').factory('GameStatus', function($rootScope) {
  var stat = {
    status: {},
    set: function(s){
      Object.keys(stat.status).forEach(function(k){
        delete stat.status[k];
      });
      angular.extend(stat.status, s);
      $rootScope.$apply();
    }
  };
  return stat;
});

angular.module('nounGame').factory('GameClient', function(GameStatus, $timeout) {

  var socket = io.connect();
  var askedAt;
  var setStatus = null;

  socket.on('disconnect', function(){
    console.log("socket disconnected");
  });

  socket.on('reconnect', function(){
    console.log("socket reconnected");
  });

  socket.on('game/status', function(s){
    GameStatus.set(s);
  });


  var nearbyCallback;
  socket.on('nearby/new', function(s){
    nearbyCallback && ret.findNearby(nearbyCallback);
  });


  var ret = {
    findNearby: function(cb){
      nearbyCallback = cb;
      socket.emit('game/nearby', {}, cb);
    },
    addWord: function(word){
      socket.emit('game/addword', word);
    },
    startTurn: function(cb){
      socket.emit('game/turn/start', cb);
    },
    slip: function(w, p){
      console.log("sending a sip", w, p);
      socket.emit('game/turn/slip', w, p);
    },
    newGame: function(p, cb){
      askedAt = new Date().getTime();
      console.log("Making new", p);
      socket.emit('game/new', p, cb);
    },
    join: function(gid, cb){
      var askedAt = new Date().getTime();
      socket.emit('game/join', gid, function(status, time){
        GameStatus.set(status);
        var now = new Date().getTime();
        var latency = (now - askedAt)/2;

        // server ahead of client == positive skew
        var skew = time + latency - now;
        ret.skew = skew;
        console.log("jpied", status, ret.skew);
      });
    }
  };

  return ret;
});



angular.module('nounGame').controller("PickRoomController",  
  function($scope, $location, $timeout, GameClient) {

    GameClient.findNearby(function(games){
      $scope.games = games;
      $scope.$apply();
    })

    $scope.pick = function(gid){
      $location.path('/play/game/'+gid);
    };

    $scope.create = function(gid, count){
      console.log("Creating new", gid, count);
      GameClient.newGame({id: gid, totalWords: count||18}, function(g){
        console.log("created", g);
        $location.path('/play/game/'+gid);
        $scope.$apply();
        console.log("updated loc");
      });
    };

  }
);

angular.module('nounGame').controller("InputController",  
  function($scope, $timeout, $routeParams, $location, GameClient) {
    $scope.addWord = function(w){
      GameClient.addWord(w);
      $scope.newWord = "";
    }
    $scope.skew = function() {
      return GameClient.skew;
    };
    $scope.newGame = function(){
      $location.path('/play/pick-game');
    };

    GameClient.join($routeParams.gid);
    $scope.wordsForRound = [];

    $scope.currentWord = function(){
      return $scope.wordsForRound && $scope.wordsForRound[0] || "no words";
    };

    $scope.playRound = function(){
      return ["Fill basket", "Game over"].indexOf($scope.status.round) === -1;
    }

    $scope.slip = function(scored){
      var word = $scope.wordsForRound.shift();
      var terminal = $scope.timeLeft === 0 || $scope.wordsForRound.length === 0;

      if(terminal) {
        $scope.currentPlayer = false;
      }
      // TODO? skipped words go to bottom of pile in case there's time left?

      GameClient.slip(word, {
        status: scored ? "hit" : "miss",
        terminal:  terminal
      })
    }

    function clearTimeVars(){
      $scope.timeToStart =  "wait...";
      $scope.timeLeft =  "";
      $scope.timeUp = false;
    }

    var countdownTimer = null,
    countdown = function(){
      countdownTimer =$timeout(function(){

        if (!$scope || !$scope.status || !$scope.status.turnEndsAt) {
          return clearTimeVars();
        }

        var finalTime =  $scope.status.turnEndsAt - GameClient.skew;
        var now = new Date().getTime(); 
        if (finalTime - $scope.status.turnDuration > now){
          var ms = (finalTime - $scope.status.turnDuration - now)
          var sec = Math.ceil(ms / 1000);
          if (sec <= 3) {
            $scope.timeToStart = sec;
          }
        } else {
          $scope.timeToStart = null;
        }
        var ms = Math.max(0, finalTime - now );
        var sec = Math.ceil(ms / 1000);
        $scope.timeLeft = sec;
        if (sec > 0) {
          countdown();
        } else {
          $scope.endTurn();
          $scope.timeUp = true;
        }
      }, 500);
    };

    function fisherYates ( myArray ) {
      var i = myArray.length, j, tempi, tempj;
      if ( i == 0 ) return false;
      while ( --i ) {
        j = Math.floor( Math.random() * ( i + 1 ) );
        tempi = myArray[i];
        tempj = myArray[j];
        myArray[i] = tempj;
        myArray[j] = tempi;
      }
      return myArray;
    }

    $scope.endTurn = function(){
      if ($scope.currentPlayer) {
        angular.element("#timeUp")[0].play();
      }
    };

    $scope.startTurn = function(){
      // copy and randomize
      countdownTimer && $timeout.cancel(countdownTimer);
      clearTimeVars();
      $scope.wordsForRound = fisherYates($scope.status.words.slice(0));
      $scope.currentPlayer = true;
      GameClient.startTurn();
    };

    $scope.$watch("status.turnEndsAt",  function(){
      countdown();
    });

  }
);

angular.module('nounGame').controller("ReadyController",  
  function($scope, GameClient) { }
);



angular.module('nounGame').controller("MainController",  
  function($scope, $location, GameClient, GameStatus) {
    $scope.status = GameStatus.status;
    $scope.debug = !!$location.search().debug;
    console.log($location.search());
  }
);

