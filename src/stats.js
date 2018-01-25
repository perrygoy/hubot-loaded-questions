// Description
//   Stats module
//   Loads, saves, and tracks the stats for Loaded Questions

let Stats = {
  numQuestions: 0,
  numAnswers: 0,
  usersData: {},
};

module.exports = function(robot) {
  /**
   * loads the stats from the brain, if available, and returns a copy of
   * the current stats.
   * @returns {Object}
   */
  this.loadStats = () => {
    Stats = robot.brain.data.loadedQuestions || Stats;

    return Object.assign({}, Stats);
  };

  this.addStatsIfMissing = user => {
    if (!Stats.usersData.hasOwnProperty(user)) {
      Stats.usersData[user] = {
        cheats: 0,
        guesses: 0,
        rights: 0,
        wrongs: 0,
        answers: 0,
      };

      this.saveStats();
    }

    return Stats;
  };

  this.cheated = user => {
    Stats = this.addStatsIfMissing(user);

    Stats.usersData[user].cheats++;
    this.saveStats();
  };

  this.correct = user => {
    Stats = this.addStatsIfMissing(user);

    Stats.usersData[user].guesses++;
    Stats.usersData[user].rights++;
    this.saveStats();
  };

  this.wrong = user => {
    Stats = this.addStatsIfMissing(user);

    Stats.usersData[user].guesses++;
    Stats.usersData[user].wrongs++;
    this.saveStats();
  };

  this.answered = user => {
    Stats = this.addStatsIfMissing(user);

    Stats.usersData[user].answers++;
    Stats.numAnswers++;
    this.saveStats();
  };

  this.this.saveStats = () => {
    robot.brain.data.loadedQuestions = Stats;
    robot.brain.emit('save', robot.brain.data);
  };
};
