angular.module('nounGame', ['smartBox'], function($routeProvider, $locationProvider){

  $routeProvider.when('/', {
    templateUrl:'/static/noun-game/templates/index.html'
  }) 

  $locationProvider.html5Mode(true);

});
