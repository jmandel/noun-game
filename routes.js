var config = require('./config');
var app = config.app;
var io = config.io;
var uuid = require('node-uuid');
var nounGame = require('./noun-game');

var games = nounGame.games,
TEAM = nounGame.TEAM,
ROUND = nounGame.ROUND,
nextTurn = nounGame.nextTurn;

app.get('/reset', function(req,res){
  nounGame.reset();
  res.redirect('/');
});

app.get('/', function(req,res){
  res.render("index");
});

app.get('/play*', function(req,res){
  res.render("index");
});

function state(){
  console.log(games);
};

function create(params){
    var g = {
      id: params.id && !games[params.id] && params.id || uuid.v4(),
      coords: params.coords || {},
      words: [],
      totalWords: params.totalWords || 18,
      guessedWords: [],
      skippedWords: [],
      round: ROUND.fillbasket,
      points: {},
      createdAt: new Date().getTime()
    };
    games[g.id]=g;
    return g;

};

io.sockets.on('connection', function(s){

  s.on('game/new', function(params, afterCreation){
    var g = create(params);
    afterCreation(g);
    io.sockets.emit('nearby/new');
  });

  s.on('game/join', function(gid, cb){
    s.join(gid);
    s.gid = gid;
    var g = games[gid];
    if (!g){
      g = create({id: gid});
    }
    console.log("joined", g);
    cb(g, new Date().getTime());
  });

  s.on('game/nearby', function(coords, cb){

    var g, 
    nearby = Object.keys(games).filter(function(gid){
      var g = games[gid];
      return true; // TODO un-stub to calculate geodistance
    }).filter(function(gid){
      return games[gid].round != ROUND.gameover;
    });

    cb(nearby.map(function(gid){return games[gid];}));
    state();
  });

  s.on('game/addword', function(word){
    var g = games[s.gid];

  console.log("adding", s.gid, word, games);
    if (!word || word === "" || word.trim() === "") return;

    g.words = g.words.filter(function(x){return x !== word;});
    g.words.push(word);

    //TODO replace with generic complete status?
    if (g.words.length > g.totalWords) {
      return;
    }
    if (g.words.length === g.totalWords && g.totalWords > 3) {
      nextTurn(g);
    }

    console.log(io.sockets);
    io.sockets.in(g.id).emit("game/status", g);

    //TODO check for == expected # and move g.waitingToBegin=true
  });

  s.on('game/turn/start', function(cb){
    var g = games[s.gid];
    if (!g.waitingToBegin) return;
    g.waitingToBegin = false;
    g.turnEndsAt  = new Date().getTime() + 33 * 1000;
    g.turnDuration  =  30 * 1000;
    io.sockets.in(g.id).emit("game/status", g);
    // TODO assign a duration /and/ finalTime,
    // building in a delay to account for "3...2...1"
    // countdown as well as 90th percentile (lag-to-clients)
    // so clients can ensure that at least duration
    // is honored.  Clients should also try to calculate
    // clock skew and pause 'til (final - duration) 
    // ... and THEN start the round.
    cb && cb();
  });

  s.on('game/turn/slip', function(word, p){
    var g = games[s.gid];

    if (!!g.waitingToBegin) return;

    var team = g.nowPlaying;
    var points = 0;

    g.words = g.words.filter(function(x){return x !== word;});
    if (p.status === "hit"){
      points++;
      g.guessedWords = g.guessedWords.filter(function(x){return x !== word;});
      g.guessedWords.push(word);
    }
    if (p.status === "miss"){
      g.skippedWords = g.skippedWords.filter(function(x){return x !== word;});
      g.skippedWords.push(word);
      if (!p.terminal){
        points--;
      }
    }

    g.points[team] += points;

    if (p.terminal) {
      nextTurn(g);
    }

    io.sockets.in(g.id).emit("game/status", g);
  });

});
