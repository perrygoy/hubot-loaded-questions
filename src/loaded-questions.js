// Description:
//   Loosely based on the hit board game by Freshly Completed, http://freshlycompleted.blogspot.com/2013/11/loaded-questions-free-printable-game.html
//
//   Play Loaded Questions, the game where guessing the answers is just as much
//   trouble as answering the questions. Comes with a default set of questions
//   out-of-the-box, and can be extended by providing a `loaded_questions.json`
//   file in the `res` directory in the root of your Hubot project.
//
//   To play the game, begin with `!loadquestion` and submit your answers in
//   PMs to Hubot. Once enough answers have been submitted, Hubot will end the
//   round automatically (or you can end it manually by saying `!endquestion`).
//   After the round is over, you can optionally guess which player submitted
//   which answers by sending `!ga [answer number] [username]`. Hubot will tell
//   you if you got it right or wrong. Then you can start a new round by saying
//   `!loadquestion` again!
//
//   This module also tracks some stats, such as how many questions have been
//   asked, how many answers have been given, etc. You can see those stats by
//   saying `!lqstats` in public or in a PM with Hubot.
//
// Configuration:
//    HUBOT_LOADED_QUESTIONS_ROOM - which channel name or ID to post messages to (this game can be a little spammy, so it's best to have a dedicated room). Default is #random.
//    HUBOT_LOADED_QUESTIONS_QUORUM - how many answers to wait for before triggering a countdown to end the round. Default is 5.
//    HUBOT_LOADED_QUESTIONS_SKIPNUM - how many users must agree to skip a question before it is skipped. Default is 2.
//    HUBOT_LOADED_QUESTIONS_TIMEOUT - how many minutes to wait during the countdown before the round ends. Default is 5.
//    HUBOT_INCLUDE_RANDOM_ANSWER - whether or not to include a random answer from last round as hubot's answer.
//
// Commands:
//   !loadquestion - (public only) starts a new question, if there isn't one currently.
//   !printquestion - (public or pm) prints the current question.
//   !skipquestion - (public only) votes to skip the current question and load a new one.
//   !endquestion - (public only) ends the round of questioning and displays the answers.
//   !printanswers - (public or pm) prints the answers that were given during the round.
//   !guessanswer [number] [user] - (public only) guess that answer `number` was submitted by `user`. You can shortcut this command with `!ga`
//   submit answer [answer] - (pm only) submits your answer to the question.
//   !lqstats [username] - (public or pm) shows some stats about the game. Optionally include a username to see stats for that specific user.
//
// Author:
//   Perry Goy https://github.com/perrygoy


const fs = require('fs');
const path = require('path');
const RefMod = require('./referee');
const StatsMod = require('./stats');

const ROOM = process.env.HUBOT_LOADED_QUESTIONS_ROOM || '#random';
const QUORUM = process.env.HUBOT_LOADED_QUESTIONS_QUORUM || 5;
const SKIPNUM = process.env.HUBOT_LOADED_QUESTIONS_SKIPNUM || 2;
const TIMEOUT = process.env.HUBOT_LOADED_QUESTIONS_TIMEOUT || 5;

const QUESTIONS = require('../res/base_questions.json');
const LIGHT_INSULTS = require('../res/light_insults.json');


module.exports = function(robot) {
    const noCurrentQuestionMsg = 'There isn\'t a question loaded right now! You can start a new round by saying `!loadquestion`.';
    const submitAnswerHelpMsg = 'You can submit your own answer by sending me a private message beginning with `submit answer`, followed by your answer.';

    const Stats = new StatsMod(robot);
    const Referee = new RefMod(robot);

    // Load default questions, will be re-set later with custom questions
    let Questions = QUESTIONS.slice();

    let timeout = null;
    let skipTimestamp = null;
    let skipVotes = new Set([]);

    this.getPluralizedNoun = (num, str, pluralizer) => {
        let pluralizedString = '';
        if (num === 1) {
            pluralizedString = `${num} ${str}`;
        } else if (str[str.length - 1] === 'y') {
            pluralizedString = `${num} ${str.slice(0, str.length - 1)}${pluralizer}`;
        } else {
            pluralizedString = `${num} ${str}${pluralizer}`;
        }
        return pluralizedString;
    };

    this.getPluralizedVerb = (num, singleVerb, pluralVerb) => {
        if (num == 1) {
            return singleVerb;
        } else {
            return pluralVerb;
        }
    };

    this.getRandomInsult = () => {
        const i = Math.floor(Math.random() * LIGHT_INSULTS.length);
        return LIGHT_INSULTS[i];
    };

    this.getUsername = response => {
        return response.message.user.name;
    };

    this.isPrivateMsg = response => {
        try {
            // Slack (and others?)
            const channel = response.message.rawMessage.channel;
            return channel.is_im || channel.id[0] == 'D';
        } catch (err) {
            // Discord
            return response.message.user.room == response.message.room;
        }
    };

    /**
   * sends a message to the Loaded Questions room.
   *
   * @param {string} msg the message to send
   */
    this.messageRoom = msg => {
        robot.messageRoom(ROOM, msg);
    };

    /**
   * sets the room's topic, if able. If the ROOM is not set to a channel
   * ID, this operation will fail and a WARNING will be logged.
   *
   * @param {string} fallbackRoomId the ID to use if ROOM is not set to an ID
   * @param {string} topic the text to set the topic to
   */
    this.setTopic = (fallbackRoomId, topic) => {
        try {
            robot.adapter.client.setTopic(ROOM, topic);
        } catch (err) {
            try {
                robot.adapter.client.setTopic(fallbackRoomId, topic);
                robot.logger.warning(`HUBOT_LOADED_QUESTIONS_ROOM must be set to a channel ID to set the topic correctly. Guessing room ID is ${fallbackRoomId}`);
            } catch (err) {
                // the adapter in use must not support topic-setting.
                robot.logger.info(`Unable to set topic, adapter doesn't seem to support it. Topic was '${topic}'`);
            }

        }
    };

    /**
   * loads the user-provided questions from `./res/loaded_questions.json`
   *
   * @return {string[]} array
   */
    this.loadExtraQuestions = () => {
        let extraQs = [];

        try {
            const buffer = fs.readFileSync(path.resolve('./res', 'loaded_questions.json'));
            extraQs = JSON.parse(buffer);
        } catch (err) {
            // If no custom questions have been provided, whatever; just use the defaults
            // ... but if it's a different error, throw that up
            if (err.code !== 'ENOENT') {
                throw (err);
            }
        }

        return extraQs;
    };

    /**
   * gets the full questions list from the base pack + the user-provided
   * questions in `res/loaded_questions.json`, if it exists.
   *
   * @return {string[]} array
   */
    this.loadAllQuestions = () => {
        Questions = QUESTIONS.slice().concat(this.loadExtraQuestions());
        return Questions;
    };

    /**
   * forces the end of the round, to be used with `setTimeout()`.
   */
    this.forceRoundOver = () => {
        this.endQuestion();
        this.messageRoom(`*ROUND ENDED!!!* (due to timeout)\n\n${this.getAnswersMsg()}`);
    };

     /**
    * Ends the round, doing the checks and tallies to get ready for next time.
    */
    this.endQuestion = () => {
        Referee.endRound();
        Stats.questionAsked();
        Stats.updatePopularRound(Referee.getNumAnswers());
    };

    /**
   * get a string to print out current question, how long this question
   * has been active, and instructions for submitting answers
   *
   * @param {object} response - hubot response object
   * @return {string} string
   */
    this.getCurQuestionMsg = () => {
        let curQuestionMsg = `The current question is: *'${Referee.currentQuestion()}'*\n`;

        const timeSinceStart = Math.floor(Math.abs(new Date() - Referee.questionTimestamp()) / (60 * 1000));
        if (timeSinceStart > 0) {
            curQuestionMsg += `The round started ~${this.getPluralizedNoun(timeSinceStart, 'minute', 's')} ago.\n\n`;
        }

        const numAnswers = Referee.getNumAnswers();
        let numAnswersMsg = '';
        if (numAnswers > 0) {
            numAnswersMsg = `There ${this.getPluralizedVerb(numAnswers, 'is', 'are')} currently ${this.getPluralizedNoun(numAnswers, 'answer', 's')} to this question.\n`;
        }

        return `${curQuestionMsg}${numAnswersMsg}${submitAnswerHelpMsg}`;
    };

    /**
   * get a message showing the list of answers, along with the display
   * names of users who submitted those answers, if any have been guessed
   * so far.
   *
   * @param {object} response - hubot response object
   * @return {string}
   */
    this.getAnswersMsg = response => {
        const numAnswers = Referee.getNumAnswers();
        let answersMessage = `There ${this.getPluralizedVerb(numAnswers, 'was', 'were')} ${this.getPluralizedNoun(numAnswers, 'answer', 's')} submitted for _'${Referee.lastQuestion()}'_:\n`;

        const curQuestion = Referee.currentQuestion();
        if (curQuestion === '') {
            const orderedAnswers = Referee.orderedAnswers();

            Object.keys(orderedAnswers).forEach(answerNum => {
                answersMessage += `> *${answerNum}.* ${orderedAnswers[answerNum].answer}`;

                if (orderedAnswers[answerNum].guessed) {
                    answersMessage += ` - *${orderedAnswers[answerNum].user}*\n`;
                } else {
                    answersMessage += '\n';
                }
            });

            if (Referee.haveAllBeenGuessed()) {
                answersMessage += '\nAll answers have been guessed! To start a new round, say `!loadquestion`.';
            } else {
                answersMessage += `\nPlayers whose answers haven't been guessed: *${Referee.getUnguessedUsers().join('*, *')}*.`;
                answersMessage += '\nTo guess who submitted an answer, say `!guessanswer [number] [username]`.';
            }
        } else {
            answersMessage = 'The round isn\'t over yet!\n\n';
            answersMessage += this.getCurQuestionMsg();
        }
        return answersMessage;
    };

    // Initialization

    if (!process.env.HUBOT_LOADED_QUESTIONS_ROOM) {
        robot.logger.info('Loaded Questions loaded, using default room #random. Set HUBOT_LOADED_QUESTIONS_ROOM to a channel name or ID to use a different room.');
    };

    this.loadAllQuestions();

    robot.brain.on('connected', () => {
        robot.logger.debug(`Loaded Questions: ${Questions.length} Questions Loaded.`);
        robot.logger.debug(`Loaded Questions: Game loaded: ${JSON.stringify(Referee.loadGame(), null, 2)}`);
        robot.logger.debug(`Loaded Questions: Stats loaded: ${JSON.stringify(Stats.loadStats(), null, 2)}`);
    });

    // Responses

    robot.hear(/submit ?answer ((.|\s)+)/i, response => {
        if (this.isPrivateMsg(response)) {
            if (Referee.roundIsInProgress()) {
                const answer = response.match[1];
                const user = this.getUsername(response);
                const answers = Referee.answers();

                if (answers.hasOwnProperty(user)) {
                    Referee.updateAnswer(user, answer);
                } else {
                    Referee.saveAnswer(user, answer);
                    const numAnswers = Referee.getNumAnswers();

                    let roomMessage = `Got an answer from someone! I now have ${this.getPluralizedNoun(numAnswers, 'answer', 's')}.`;

                    if (numAnswers === QUORUM) {
                        roomMessage += `\n_QUORUM REACHED!_ This round will end in ${TIMEOUT} minutes.`;
                        timeout = setTimeout(() => this.forceRoundOver(), TIMEOUT * 60 * 1000);
                    }
                    this.messageRoom(roomMessage);
                }

                response.send('Got it. If you change your mind, submit your answer again and I\'ll update it.');
                Stats.answered(user);
            } else {
                response.send(noCurrentQuestionMsg);
            }
        } else {
            response.send('Nah, you need to submit your answers in a private message with me. I\'ll pretend I didn\'t see that.');
        }
    });

    robot.hear(/!loadquestions?/i, response => {
        if (!Referee.roundIsInProgress()) {
            Referee.startNewRound(Questions);
            try {
                this.setTopic(response.message.room, Referee.currentQuestion());
            } catch (err) {
                console.log(err);
            }

            this.messageRoom(`*NEW ROUND STARTED!!!*\n\n${this.getCurQuestionMsg()}`);
        } else {
            response.send(`There is already a question loaded!\n\n${this.getCurQuestionMsg()}`);
        }
    });

    robot.hear(/!printquestions?/i, response => {
        if (Referee.roundIsInProgress()) {
            response.send(this.getCurQuestionMsg());
        } else {
            response.send(noCurrentQuestionMsg);
        }
    });

    robot.hear(/^!skipquestions?/i, response => {
        let message = '';

        if ((skipTimestamp != null) && ((new Date() - skipTimestamp / 1000) < 10)) {
            // We probably just skipped a question and this vote came a little late
            message = 'Sorry, there\'s a 10 second cooldown to skipping questions to prevent from skipping another one accidentally.\n\n';
            message += `You can vote to skip again in ${(10 - (new Date() - skipTimestamp / 1000))} seconds.`;
        } else {
            skipTimestamp = null;

            const username = this.getUsername(response);
            skipVotes.add(username);

            if (skipVotes.size < SKIPNUM) {
                message = `*Vote to skip added!* ${this.getPluralizedNoun(SKIPNUM - skipVotes.size, 'vote', 's')} more and we'll skip this one!`;
            } else {
                if (Referee.roundIsInProgress()) {
                    const quips = [
                        'Yeah, I didn\'t like it either.',
                        'That question _is_ pretty played out.',
                        'I already knew how everyone was going to answer.',
                        'Aww but I had such a good answer! Oh well --',
                        'Bang! Zoom!',
                        'Who would even think to ask a question like that anyway?',
                        'I\'ll see if I\'ve got a better one laying around here somewhere...',
                        'You\'re right. I\'m sorry. You deserve better than that.',
                    ];
                    const i = Math.floor(Math.random() * quips.length);
                    message = `${quips[i]} _SKIPPED!_\n\n`;

                    this.endQuestion()
                }
                Referee.startNewRound(Questions);
                skipVotes = new Set([]);
                skipTimestamp = new Date();

                this.setTopic(response.message.room, Referee.currentQuestion());
                message += `*NEW ROUND STARTED!!!*\n\n${this.getCurQuestionMsg()}`;
            }
        }
        this.messageRoom(message);
    });

    robot.hear(/^!endquestions?/i, response => {
        if (Referee.roundIsInProgress()) {
            this.endQuestion();

            response.send(`*ROUND ENDED!!!*\n\n${this.getAnswersMsg()}`);

            if (timeout != null) {
                clearTimeout(timeout);
                timeout = null;
            }
        } else {
            response.send(noCurrentQuestionMsg);
        }
    });

    robot.hear(/!printanswers?/i, response => {
        response.send(this.getAnswersMsg());
    });

    robot.hear(/^!(guess ?answer|ga) (\d+) (.*?)\s*$/i, response => {
        let message = '';

        if (Referee.roundIsInProgress()) {
            message = 'The round isn\'t over yet! To end the round, say `!endquestion`.\n';
            message += submitAnswerHelpMsg;
        } else if (Referee.haveAllBeenGuessed()) {
            message = 'All answers have been guessed! To start a new round, say `!loadquestion`.';
        } else if (Referee.getNumAnswers() > 0) {
            const answerNum = Number(response.match[2]);
            let user = response.match[3];
            const username = this.getUsername(response);

            const answers = Referee.answers();
            const orderedAnswers = Referee.orderedAnswers();

            if (user.startsWith('@')) {
                user = user.substr(1);
            }

            if (username === user) {
                response.send('You can\'t guess your own answer, cheater!');
                Stats.cheated(username);
                return;
            }

            if (answers.hasOwnProperty(user)) {
                if (!orderedAnswers[answerNum].guessed && !answers[user].guessed) {
                    if (orderedAnswers[answerNum].user === user) {
                        Referee.answerFound(user, answerNum);
                        message = `You got it!! '${answers[user].answer}' was submitted by ${user}.\n\n`;

                        Stats.correct(username);

                        if (Referee.haveAllBeenGuessed()) {
                            message += this.getAnswersMsg();
                            this.setTopic(response.message.room, 'Ready to start next round!');
                        }
                    } else {
                        message = 'Nope, guess again.';
                        Stats.wrong(username);
                    }
                } else {
                    if (answers[user].guessed) {
                        message = `That user\'s answer was already found, you ${this.getRandomInsult()}!\n\n`;
                        Stats.wrong(username);
                    } else {
                        message = `That answer number was already correctly guessed, you ${this.getRandomInsult()}!\n\n`;
                        Stats.wrong(username);
                    }
                }
            } else {
                message = 'That user didn\'t submit an answer to this question. :cold_sweat:';
                Stats.wrong(username);
            }
        } else if (Referee.getNumAnswers() === 0) {
            message = 'There were no answers for the previous round! Sorry about that :\\';
        } else {
            message = 'Whoa jeez i\'m not sure how we got here.';
        }
        response.send(message);
    });

    robot.hear(/!lqstats ?(.*)?/i, response => {
        const user = response.match[1];
        let message = '_Stats';
        const stats = Stats.loadStats();

        if (user) {
            const data = stats.usersData[user];
            message += ` for *${user}*_:\n\n`;
            message += `>*Total Answers Given*: ${data.answers}\n`;
            message += `>*Total Guesses*: ${data.guesses}\n`;
            message += `>  - *Total Correct*: ${data.rights}\n`;
            message += `>  - *Total Incorrect*: ${data.wrongs}\n`;
            message += `>  - *Total Cheats*: ${data.cheats}`;
        } else {
            message += ' for Loaded Questions_:\n\n';
            message += `>*Questions Loaded This Round*: ${Referee.recentQuestions.length}\n`;
            message += `>*Total Questions*: ${Questions.length}\n`;
            message += `>*Total Questions Loaded*: ${stats.numQuestions}\n`;
            message += `>*Total Answers Given*: ${stats.numAnswers}\n`;
            message += `>*Most Popular Round*: ${stats.mostPopularRound} answers given\n`
            message += `>*Players*: ${Object.keys(stats.usersData).join(', ')}\n\n`;
            message += '_To find out stats about a specific player, say_ `!lqstats [username]`.';
        }

        response.send(message);
    });
};
