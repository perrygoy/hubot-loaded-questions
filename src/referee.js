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

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}


module.exports = function(robot) {

  /**
   * loads the game from the brain, if available, and returns a copy of
   * the current game state.
   */
  this.loadGame = function() {
    Game = robot.brain.data.loadedQuestionsGame || Game;

    return Object.assign({}, Game);
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
    return Object.assign({}, Game['orderedAnswers']);;
  }

  this.answers = function() {
    return Object.assign({}, Game['answers']);;
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
  this.getNewishQuestion = function(questions) {
    if (Game['recentQuestions'].length == questions.length) {
      Game['recentQuestions'] = [];
      saveGame();
    }
    robot.logger.info("Loaded Questions: " + (questions.length - Game['recentQuestions'].length) + " new questions remaining.");

    const nonAskedQs = questions.filter( q => Game['recentQuestions'].indexOf(q) < 0 );

    const i = Math.floor(Math.random() * nonAskedQs.length);
    const newQuestion = nonAskedQs[i];

    return newQuestion;
  }

  /**
   * start a new round: get a new question, re-initialize all the round
   * data, set the topic, and save the game-state.
   */
  this.startNewRound = function(questions) {
    const question = getNewishQuestion(questions);

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
    const numGuessed = 0;
    for (let user of Game['answers']) {
      if (Game['answers'][user]['guessed']) {
        numGuessed++;
      }
    }

    return numGuessed;
  }

  /**
   * gets the list of users who haven't been guessed yet.
   *
   * @return array
   **/
  this.getUnguessedUsers = function() {
    const users = [];
    for (let user of Game['answers']) {
      if (!Game['answers'][user]['guessed']) {
        users.push(user)
      }
    }

    return shuffle(users);
  }

  this.haveAllBeenGuessed = function() {
    return getNumGuessed() == getNumAnswers();
  }

  this.endRound = function() {
    Game['recentQuestions'].push(Game['curQuestion']);

    Game['lastQuestion'] = Game['curQuestion'];
    Game['curQuestion'] = '';
    Game['questionTimestamp'] = null;

    let users = [];
    for (let user of Game['answers']){
      const obj = Game['answers'][user];
      obj['user'] = user;
      obj['guessed'] = false;
      users.push(obj);
    }

    users = shuffle(users);
    for (let i = 1; i <= users.length; i++) {
      Game['orderedAnswers'][i] = users[i - 1];
    }

    saveGame();
  }

  this.saveGame = function() {
    robot.brain.data.loadedQuestionsGame = Game;
    robot.brain.emit('save', robot.brain.data);
  }
}
