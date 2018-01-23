// Description
//   Stats module
//   Loads, saves, and tracks the stats for Loaded Questions

var Stats = {
  'numQuestions': 0,
  'numAnswers': 0,
  'usersData': {},
}

module.exports = function(robot) {

  /**
   * loads the stats from the brain, if available, and returns a copy of
   * the current stats.
   */
  this.loadStats = function() {
    Stats = robot.brain.data.loadedQuestions || Stats
    var statsCopy = Object.assign({}, Stats);

    return statsCopy;
  }

  this.addStatsIfMissing = function(user) {
    if (!Stats['usersData'].hasOwnProperty(user)) {
      Stats['usersData'][user] = {
        'cheats': 0,
        'guesses': 0,
        'rights': 0,
        'wrongs': 0,
        'answers': 0,
      }

      saveStats();
    }

    return Stats;
  }

  this.cheated = function(user) {
    Stats = addStatsIfMissing(user);

    data = Stats['usersData'][user]
    data['cheats']++;
    saveStats();
  }

  this.correct = function(user) {
    Stats = addStatsIfMissing(user);

    data = Stats['usersData'][user]
    data['guesses']++;
    data['rights']++;
    saveStats();
  }

  this.wrong = function(user) {
    Stats = addStatsIfMissing(user);

    data = Stats['usersData'][user]
    data['guesses']++;
    data['wrongs']++;
    saveStats();
  }

  this.answered = function(user) {
    Stats = addStatsIfMissing(user);

    data = Stats['usersData'][user]
    data['answers']++;
    Stats['numAnswers']++;
    saveStats();
  }

  this.saveStats = function() {
    robot.brain.data.loadedQuestions = Stats;
    robot.brain.emit('save', robot.brain.data);
  }
}
