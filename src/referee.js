// Description
//   Referee module
//   Loads and saves the game data for Loaded Questions, and keeps track of the rounds.

var Game = {
      'curQuestion': '',
      'lastQuestion': '',
      'questionTimestamp': null,
      'answers': {},
      'orderedAnswers': {},
      'recentQuestions': [],
    }

function shuffle(array) {
  if (array.length <= 1) {
    return array;
  }

  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


module.exports = function(robot) {

  /**
   * loads the game from the brain, if available, and returns a copy of
   * the current game state.
   */
  this.loadGame = function() {
    Game = robot.brain.data.loadedQuestionsGame || Game;
    var gameCopy = Object.assign({}, Game);

    return gameCopy;
  }

  // Game info

  this.currentQuestion = function() {
    return Game['curQuestion'];
  }

  this.lastQuestion = function() {
    return Game['lastQuestion'];
  }

  this.questionTimestamp = function() {
    return Game['questionTimestamp'];
  }

  this.orderedAnswers = function() {
    var orderedAnswers = Object.assign({}, Game['orderedAnswers']);
    return orderedAnswers;
  }

  this.answers = function() {
    var answers = Object.assign({}, Game['answers']);
    return answers;
  }

  this.recentQuestions = function() {
    return Game['recentQuestions'].slice();
  }

  this.roundIsInProgress = function() {
    return Game['curQuestion'] != '';
  }

  // Actions

  /**
   * gets a new-ish question, by stripping out the already-asked questions
   * (if any) and getting a random question from the remaining list.
   *
   * @return string
   */
  var getNewishQuestion = function(questions) {
    if (Game['recentQuestions'].length == questions.length) {
      Game['recentQuestions'] = [];
      saveGame();
    }
    robot.logger.info("Loaded Questions: " + (questions.length - Game['recentQuestions'].length) + " new questions remaining.");

    var nonAskedQs = questions.filter( q => Game['recentQuestions'].indexOf(q) < 0 );

    var i = Math.floor(Math.random() * nonAskedQs.length);
    var newQuestion = nonAskedQs[i];

    return newQuestion;
  }

  /**
   * start a new round: get a new question, re-initialize all the round
   * data, set the topic, and save the game-state.
   */
  this.startNewRound = function(questions) {
    var question = getNewishQuestion(questions);

    Game['curQuestion'] = question;
    Game['questionTimestamp'] = new Date();
    Game['answers'] = {};
    Game['orderedAnswers'] = {};
    Game['numQuestions']++;

    saveGame();
  }

  this.updateAnswer = function(user, answer) {
    Game['answers'][user]['answer'] = answer;

    saveGame();
  }

  this.saveAnswer = function(user, answer) {
    Game['answers'][user] = { 'answer': answer, 'guessed': false };

    saveGame();
  }

  this.answerFound = function(user, answerNum) {
    Game['orderedAnswers'][answerNum]['guessed'] = true;
    Game['answers'][user]['guessed'] = true;

    saveGame();
  }

  /**
   * gets the number of answers that have been submitted for this question
   *
   * @return integer
   */
  this.getNumAnswers = function () {
    return Object.keys(Game['answers']).length;
  }

  /**
   * gets the number of answers that have been guessed correctly
   *
   * @return integer
   */
  this.getNumGuessed = function () {
    var numGuessed = 0;
    for (var user in Game['answers']) {
      if (Game['answers'][user]['guessed']) {
        numGuessed++;
      }
    }
    return numGuessed;
  }

  this.haveAllBeenGuessed = function() {
    return getNumGuessed() == getNumAnswers();
  }

  this.endRound = function() {
    Game['recentQuestions'].push(Game['curQuestion']);

    Game['lastQuestion'] = Game['curQuestion'];
    Game['curQuestion'] = '';
    Game['questionTimestamp'] = null;

    var users = [];
    for (var user in Game['answers']){
      var obj = Game['answers'][user];
      obj['user'] = user;
      obj['guessed'] = false;
      users.push(obj);
    }

    users = shuffle(users);
    for (var i = 1; i <= users.length; i++) {
      Game['orderedAnswers'][i] = users[i - 1];
    }

    saveGame();
  }

  this.saveGame = function() {
    robot.brain.data.loadedQuestionsGame = Game;
    robot.brain.emit('save', robot.brain.data);
  }
}
