// Description
//   Referee module
//   Loads and saves the game data for Loaded Questions, and keeps track of the rounds.

const INCLUDE_RANDOM_ANSWER = process.env.HUBOT_INCLUDE_RANDOM_ANSWER || true;

let REPLACEMENT_STR = "{{}}";
let Game = {
    curQuestion: '',
    lastQuestion: '',
    questionTimestamp: null,
    lastCourAnswers: [],
    currentCourAnswers: [],
    answers: {},
    orderedAnswers: {},
    recentQuestions: [],
};

// Helpers

function randomInt(max_ind) {
    return Math.floor(Math.random() * max_ind);
};

 /**
* Shuffles array in place. ES6 version
* @param {[]} a items An array containing the items.
* @returns {[]}
*/
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};


// Module


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
        return new Date(Game.questionTimestamp);
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

    this.resetRecentQuestions = () => {
        Game.recentQuestions = [];
        Game.lastCourAnswers = Game.currentCourAnswers.slice();
        Game.currentCourAnswers = [];
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
        robot.logger.info(`Loaded Questions: ${questions.length - Game.recentQuestions.length} new questions remaining.`);

        const nonAskedQs = questions.filter(q => Game.recentQuestions.indexOf(q) < 0);
        if (nonAskedQs.length <= 0) {
            this.resetRecentQuestions();
            this.saveGame();

            nonAskedQs = questions.filter(q => Game.recentQuestions.indexOf(q) < 0);
        }

        const i = randomInt(nonAskedQs.length);
        let question = nonAskedQs[i];

        Game.recentQuestions.push(nonAskedQs[i]);

        // Handle the random-support questions
        if (!(typeof question === 'string' || question instanceof String)) {
            question = String(nonAskedQs[i].question);
            const data = nonAskedQs[i].data.slice();

            while (question.includes(REPLACEMENT_STR)) {
                const j = randomInt(data.length);
                question = question.replace(REPLACEMENT_STR, data[j]);
            }
        }

        return question;
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
   * gets the answers that were submitted
   *
   * @returns {string[]} answers
   */
    this.getAnswerStrings = () => {
        return Object.values(Game.answers).map(answerobj => answerobj.answer);
    };

    /**
   * adds this question's answers to the current round answer list, to be
   * used by the bot next round.
   */
    this.addCurrentAnswers = (answerList) => {
        // backwards compatibility, since this is a new property
        const currentAnswers = Game.currentCourAnswers || [];

        Game.currentCourAnswers = [...currentAnswers, ...answerList];
        this.saveGame();
    };

    /*
   * gets a bot answer by selecting randomly from the provided answer list.
   * The answer list will most likely be the last round's answers.
   */
    this.getBotAnswer = (answerList) => {
        if (!answerList || answerList.length == 0){
            return null;
        }

        const i = randomInt(answerList.length);
        return answerList[i];
    };

    /**
   * generates ordered answers list
   */
    this.generateOrderedAnswers = () => {
        const botAnswer = this.getBotAnswer(Game.lastCourAnswers);
        if (botAnswer !== null) {
            this.saveAnswer(robot.name, botAnswer);
        }

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
   * gets the number of answers that have been guessed correctly.
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
   */
    this.getUnguessedUsers = () => {
        const users = Object.keys(Game.answers).filter(user => !Game.answers[user].guessed);

        return shuffle(users);
    };

    this.haveAllBeenGuessed = () => {
        return this.getNumGuessed() === this.getNumAnswers();
    };

    this.endRound = () => {
        Game.lastQuestion = Game.curQuestion;
        Game.curQuestion = '';
        Game.questionTimestamp = null;

        this.addCurrentAnswers(this.getAnswerStrings());
        this.generateOrderedAnswers();
        this.saveGame();
    };

    this.saveGame = () => {
        robot.brain.data.loadedQuestionsGame = Game;
        robot.brain.emit('save', robot.brain.data);
    };
};
