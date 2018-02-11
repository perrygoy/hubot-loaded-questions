// Description
//   Referee module
//   Loads and saves the game data for Loaded Questions, and keeps track of the rounds.

let Game = {
    curQuestion: '',
    lastQuestion: '',
    questionTimestamp: null,
    answers: {},
    orderedAnswers: {},
    recentQuestions: [],
};

/**
 * Shuffles array in place. ES6 version
 * @param {[]} a items An array containing the items.
 * @returns {[]}
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
   * @returns {Object}
   */
    this.loadGame = () => {
        Game = robot.brain.data.loadedQuestionsGame || Game;

        return Object.assign({}, Game);
    };

    // Game info

    this.currentQuestion = () => {
        return Game.curQuestion;
    };

    this.lastQuestion = () => {
        return Game.lastQuestion;
    };

    this.questionTimestamp = () => {
        return Game.questionTimestamp;
    };

    this.orderedAnswers = () => {
        if (Object.keys(Game.orderedAnswers).length === 0) {
            this.generateOrderedAnswers();
        }
        return Object.assign({}, Game.orderedAnswers);
    };

    this.answers = () => {
        return Object.assign({}, Game.answers);
    };

    this.recentQuestions = () => {
        return Game.recentQuestions.slice();
    };

    this.roundIsInProgress = () => {
        return Game.curQuestion !== '';
    };

    // Actions

    /**
   * gets a new-ish question, by stripping out the already-asked questions
   * (if any) and getting a random question from the remaining list.
   *
   * @param {string[]} questions
   * @return {string}
   */
    this.getNewishQuestion = questions => {
        if (Game.recentQuestions.length === questions.length) {
            Game.recentQuestions = [];
            this.saveGame();
        }
        robot.logger.info(`Loaded Questions: ${questions.length - Game.recentQuestions.length} new questions remaining.`);

        const nonAskedQs = questions.filter(q => Game.recentQuestions.indexOf(q) < 0);
        const i = Math.floor(Math.random() * nonAskedQs.length);

        return nonAskedQs[i];
    };

    /**
   * start a new round: get a new question, re-initialize all the round
   * data, set the topic, and save the game-state.
   * @param {string[]} questions
   */
    this.startNewRound = questions => {
        const question = this.getNewishQuestion(questions);

        Game.curQuestion = question;
        Game.questionTimestamp = new Date();
        Game.answers = {};
        Game.orderedAnswers = {};
        Game.numQuestions++;

        this.saveGame();
    };

    this.updateAnswer = (user, answer) => {
        Game.answers[user].answer = answer;

        this.saveGame();
    };

    this.saveAnswer = (user, answer) => {
        Game.answers[user] = {
            answer,
            guessed: false,
        };

        this.saveGame();
    };

    this.answerFound = (user, answerNum) => {
        Game.orderedAnswers[answerNum].guessed = true;
        Game.answers[user].guessed = true;

        this.saveGame();
    };

    /**
   * gets the number of answers that have been submitted for this question
   *
   * @returns {number} integer
   */
    this.getNumAnswers = () => {
        return Object.keys(Game.answers).length;
    };

    /**
   * generates ordered answers list
   */
    this.generateOrderedAnswers = () => {
        let users = [];
        Object.keys(Game.answers).forEach(user => {
            const obj = Game.answers[user];
            obj.user = user;
            obj.guessed = false;
            users.push(obj);
        });

        users = shuffle(users);
        for (let i = 1; i <= users.length; i++) {
            Game.orderedAnswers[i] = users[i - 1];
        }

        this.saveGame();
    };

    /**
   * gets the number of answers that have been guessed correctly
   *
   * @returns {number} integer
   */
    this.getNumGuessed = () => {
        let numGuessed = 0;
        Object.keys(Game.answers).forEach(user => {
            if (Game.answers[user].guessed) {
                numGuessed++;
            }
        });

        return numGuessed;
    };

    /**
   * gets the list of users who haven't been guessed yet.
   *
   * @returns {Object[]} array
   **/
    this.getUnguessedUsers = () => {
        const users = Object.keys(Game.answers).filter(user => !Game.answers[user].guessed);

        return shuffle(users);
    };

    this.haveAllBeenGuessed = () => {
        return this.getNumGuessed() === this.getNumAnswers();
    };

    this.endRound = () => {
        Game.recentQuestions.push(Game.curQuestion);

        Game.lastQuestion = Game.curQuestion;
        Game.curQuestion = '';
        Game.questionTimestamp = null;

        this.generateOrderedAnswers();
        this.saveGame();
    };

    this.saveGame = () => {
        robot.brain.data.loadedQuestionsGame = Game;
        robot.brain.emit('save', robot.brain.data);
    };
};
