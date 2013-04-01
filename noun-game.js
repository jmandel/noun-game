var games =  {};

var TEAM = {
  orange: "Orange",
  blue: "Blue"
};

var ROUND = {
  fillbasket: "Fill basket",
  taboo: "Taboo",
  oneword: "Just one word",
  charades: "No words (Charades)",
  gameover: "Game over"
};

function inc(enumDict, val){
  var keys = Object.keys(enumDict);
  var vals = Object.keys(enumDict).map(function(k){
    return enumDict[k];
  });
  var incIndex = vals.indexOf(val)+1;
  incIndex %= keys.length;
  console.log("enum inc", val, enumDict[keys[incIndex]], keys, incIndex, keys.indexOf(enumDict[val]), enumDict[val]);
  return enumDict[keys[incIndex]];
};

function nextTurn(g){
  console.log("invoked nr", g, g.round===ROUND.fillbasket);
  if (g.round === ROUND.fillbasket){
    g.round = inc(ROUND, g.round);
    g.nowPlaying = TEAM.blue;
    Object.keys(TEAM).forEach(function(t){
      g.points[TEAM[t]] = 0;
    });
  }

  [].push.apply(g.words, g.skippedWords);
  g.skippedWords = [];

  if (g.words.length === 0) {
    g.round = inc(ROUND, g.round);
    [].push.apply(g.words, g.guessedWords);
    g.guessedWords = [];
  } 

  g.nowPlaying = inc(TEAM, g.nowPlaying);
  g.waitingToBegin = true;
  if (g.round === ROUND.gameover) {
    g.waitingToBegin = false;
  }
};


module.exports = {
  games: games,
  TEAM: TEAM,
  ROUND: ROUND,
  nextTurn: nextTurn,
  reset: function(){
    Object.keys(games).forEach(function(gid){
      delete games[gid];
    });
  }
};
