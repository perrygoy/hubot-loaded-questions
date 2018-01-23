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


var fs = require('fs');
var path = require('path');
var refMod = require('./referee');
var statsMod = require('./stats');

var ROOM = process.env.HUBOT_LOADED_QUESTIONS_ROOM || "#random";
var QUORUM = process.env.HUBOT_LOADED_QUESTIONS_QUORUM || 5;
var SKIPNUM = process.env.HUBOT_LOADED_QUESTIONS_SKIPNUM || 2;
var TIMEOUT = process.env.HUBOT_LOADED_QUESTIONS_TIMEOUT || 5;

var QUESTIONS = require('../res/base_questions.json');
var LIGHT_INSULTS = require('../res/light_insults.json');


module.exports = function(robot) {
  var noCurrentQuestionMsg = 'There isn\'t a question loaded right now! You can start a new round by saying `!loadquestion`.';
  var submitAnswerHelpMsg = 'You can submit your own answer by sending me a private message beginning with `submit answer`, followed by your answer.';

  var Stats = new statsMod(robot);
  var Referee = new refMod(robot);
  var Questions = QUESTIONS.slice();

  var game = Referee.loadGame();
  var stats = Stats.loadStats();

  var timeout = null;
  var skipTimestamp = null;
  var skipVotes = new Set([]);

  if (!process.env.HUBOT_LOADED_QUESTIONS_ROOM) {
    robot.logger.info("Loaded Questions loaded, using default room #random. Set HUBOT_LOADED_QUESTIONS_ROOM to a channel name or ID to use a different room.")
  }

  var getPluralizedNoun = function(num, str, pluralizer) {
    var pluralizedString = '';
    if (num == 1) {
      pluralizedString = num + ' ' + str;
    } else {
      pluralizedString = num + ' ' + str + pluralizer;
    }
    return pluralizedString;
  }

  var getPluralizedVerb = function(num, singleVerb, pluralVerb) {
    if (num == 1) {
      return singleVerb;
    } else {
      return pluralVerb;
    }
  }

  var getRandomInsult = function() {
    var i = Math.floor(Math.random() * LIGHT_INSULTS.length);
    return LIGHT_INSULTS[i];
  }

  var getUsername = function(msg) {
    return msg.message.user.profile.display_name;
  }

  var isPrivateMsg = function(msg) {
    return msg.message.rawMessage.channel.is_im;
  }

  /**
   * sends a message to the Loaded Questions room.
   *
   * @param msg the message to send
   */
  var messageRoom = function(msg) {
    robot.messageRoom(ROOM, msg);
  }

  /**
   * sets the room's topic, if able. If the ROOM is not set to a channel
   * ID, this operation will fail and a WARNING will be logged.
   *
   * @param fallbackRoomId the ID to use if ROOM is not set to an ID
   * @param topic the text to set the topic to
   */
  var setTopic = function(fallbackRoomId, topic) {
    try {
      robot.adapter.client.setTopic(ROOM, topic);
    } catch(err) {
      robot.logger.warning("HUBOT_LOADED_QUESTIONS_ROOM must be set to a channel ID to set the topic correctly. Guessing room ID is " + fallbackRoomId)
      robot.adapter.client.setTopic(fallbackRoomId, topic);
    }
  }

  /**
   * loads the user-provided questions from `./res/loaded_questions.json`
   *
   * @return array
   */
  var loadExtraQuestions = function() {
    var extraQs = [];

    try {
      var buffer = fs.readFileSync(path.resolve('./res', 'loaded_questions.json'));
      extraQs = JSON.parse(buffer);
    } catch (err) {
      // If no custom questions have been provided, whatever; just use the defaults
      // ... but if it's a different error, throw that up
      if (err.code !== 'ENOENT') {
        throw(err);
      }
    }

    return extraQs;
  }

  /**
   * gets the full questions list from the base pack + the user-provided
   * questions in `res/loaded_questions.json`, if it exists.
   *
   * @return array
   */
  var getAllQuestions = function() {
    var questions = QUESTIONS.slice();
    questions = questions.concat(loadExtraQuestions());

    return questions;
  }

  /**
   * forces the end of the round, to be used with `setTimeout()`.
   */
  var forceRoundOver = function() {
    Referee.endRound();
    checkRecentQuestions();

    messageRoom('*ROUND ENDED!!!* (due to timeout)\n\n' + getAnswersMsg());
  }

  /**
   * checks if it's time to reset the Recent Questions list.
   */
  var checkRecentQuestions = function() {
    if (Referee.recentQuestions().length == Questions.length) {
      Referee.resetRecentQuestions();
    }
  }

  /**
   * get a string to print out current question, how long this question
   * has been active, and instructions for submitting answers
   *
   * @param {object} msg - hubot msg object
   * @return string
   */
  this.getCurQuestionMsg = function() {
    var curQuestionMsg = 'The current question is: *"' + Referee.currentQuestion() + '"*\n';

    var timeSinceStart = Math.floor(Math.abs(new Date() - new Date(Referee.questionTimestamp())) / (60*1000));
    if (timeSinceStart > 0) {
      curQuestionMsg += 'The round started ~' + getPluralizedNoun(timeSinceStart, 'minute', 's') + ' ago.\n\n';
    }

    numAnswers = Referee.getNumAnswers();
    numAnswersMsg = '';
    if (numAnswers > 0) {
      numAnswersMsg = 'There ' + getPluralizedVerb(numAnswers, 'is', 'are') + ' currently ' + getPluralizedNoun(numAnswers, 'answer', 's') + ' to this question.\n';
    }

    return curQuestionMsg + numAnswersMsg + submitAnswerHelpMsg;
  }

  /**
   * get a message showing the list of answers, along with the display
   * names of users who submitted those answers, if any have been guessed
   * so far.
   *
   * @param {object} msg - hubot msg object
   * @return string
   */
  var getAnswersMsg = function(msg) {
    var numAnswers = Referee.getNumAnswers();
    var answersMessage = 'There ' + getPluralizedVerb(numAnswers, 'was', 'were') + ' ' + getPluralizedNoun(numAnswers, 'answer', 's') + ' submitted for _"' + Referee.lastQuestion() + '"_:\n';

    var curQuestion = Referee.currentQuestion();
    if (curQuestion == '') {
      var number = 1;
      var unguessedUsers = []
      var orderedAnswers = Referee.orderedAnswers();

      for (var answerNum in orderedAnswers) {
        answersMessage += '> *' + answerNum + '.* ' + orderedAnswers[answerNum]['answer'];

        if (orderedAnswers[answerNum]['guessed']) {
          answersMessage += ' - *' + orderedAnswers[answerNum]['user'] + '*\n';
        } else {
          answersMessage += '\n';
          unguessedUsers.push(orderedAnswers[answerNum]['user']);
        }
      }

      if (Referee.haveAllBeenGuessed()) {
        answersMessage += '\nAll answers have been guessed! To start a new round, say `!loadquestion`.';
      } else {
        answersMessage += '\nPlayers whose answers haven\'t been guessed: *' + unguessedUsers.join('*, *') + '*.';
        answersMessage += '\nTo guess who submitted an answer, say `!guessanswer [number] [username]`.'
      }
    } else {
      answersMessage = 'The round isn\'t over yet!\n\n';
      answersMessage += getCurQuestionMsg();
    }
    return answersMessage
  }

  // Initialization

  robot.brain.on('connected', function() {
    stats = Stats.loadStats();
    game = Referee.loadGame();

    robot.logger.debug("Loaded Questions: Game loaded: " + JSON.stringify(game, null, 2));
    robot.logger.debug("Loaded Questions: Stats loaded: " + JSON.stringify(stats, null, 2));
  });

  // Responses

  robot.hear(/submit ?answer ((.|\s)+)/i, function(msg) {
    if (isPrivateMsg(msg)) {
      var curQuestion = Referee.currentQuestion();

      if (Referee.roundIsInProgress()) {
        var answer = msg.match[1];
        var user = getUsername(msg);
        var answers = Referee.answers();

        if (answers.hasOwnProperty(user)) {
          Referee.updateAnswer(user, answer);
        } else {
          Referee.saveAnswer(user, answer)
          var numAnswers = Referee.getNumAnswers();

          var roomMessage = 'Got an answer from someone! I now have ' + getPluralizedNoun(numAnswers, 'answer', 's') + '.';

          if (numAnswers == QUORUM) {
            roomMessage += '\n_QUORUM REACHED!_ This round will end in ' + TIMEOUT + ' minutes.'
            timeout = setTimeout(() => forceRoundOver(), TIMEOUT*60*1000);
          }
          messageRoom(roomMessage);
        }

        msg.send('Got it. If you change your mind, submit your answer again and I\'ll update it.');
        Stats.answered(user);
      } else {
        msg.send(noCurrentQuestionMsg);
      }
    } else {
      msg.send('Nah, you need to submit your answers in a private message with me. I\'ll pretend I didn\'t see that.');
    }
  });

  robot.hear(/!loadquestions?/i, function(msg) {
    if (!Referee.roundIsInProgress()) {
      Referee.startNewRound(Questions);

      setTopic(msg.message.room, Referee.currentQuestion());
      messageRoom('*NEW ROUND STARTED!!!*\n\n' + getCurQuestionMsg());
    } else {
      msg.send('There is already a question loaded!\n\n' + getCurQuestionMsg());
    }
  });

  robot.hear(/!printquestions?/i, function(msg) {
    if (Referee.roundIsInProgress()) {
      msg.send(getCurQuestionMsg());
    } else {
      msg.send(noCurrentQuestionMsg);
    }
  });

  robot.hear(/^!skipquestions?/i, function(msg) {
    var message = '';

    if ((skipTimestamp != null) && ((new Date() - skipTimestamp/1000) < 10)){
      // We probably just skipped a question and this vote came a little late
      message = "Sorry, there's a 10 second cooldown to skipping questions, to prevent from skipping another one accidentally.\n\n";
      message += "You can vote to skip again in " + (10 - (new Date() - skipTimestamp/1000)) + " seconds.";
    } else {
      skipTimestamp = null;

      var username = getUsername(msg);
      skipVotes.add(username)

      if (skipVotes.size < SKIPNUM) {
        message = "*Vote to skip added!* " + getPluralizedNoun(SKIPNUM - skipVotes.size, "vote", "s") + " more and we'll skip this one!"
      } else {
        if (Referee.roundIsInProgress()){
          var quips = [
            'Yeah, I didn\'t like it either.',
            'That question _is_ pretty played out.',
            'I already knew how everyone was going to answer.',
            'Aww but I had such a good answer! Oh well --',
            'Bang! Zoom!',
            'Who would even think to ask a question like that anyway?',
            'I\'ll see if I\'ve got a better one laying around here somewhere...',
            'You\'re right. I\'m sorry. You deserve better than that.'
          ];
          var i = Math.floor(Math.random() * quips.length);
          message = quips[i] + ' _SKIPPED!_\n\n'

          Referee.endRound();
          checkRecentQuestions();
        }
        Referee.startNewRound(Questions);
        skipVotes = new Set([]);
        skipTimestamp = new Date();

        setTopic(msg.message.room, Referee.currentQuestion());
        message += '*NEW ROUND STARTED!!!*\n\n' + getCurQuestionMsg()
      }
    }
    messageRoom(message);
  });

  robot.hear(/^!endquestions?/i, function(msg) {
    if (Referee.roundIsInProgress()) {
      Referee.endRound();
      checkRecentQuestions();

      msg.send('*ROUND ENDED!!!*\n\n' + getAnswersMsg());

      if (timeout != null) {
        clearTimeout(timeout);
        timeout = null;
      }
    } else {
      msg.send(noCurrentQuestionMsg);
    }
  });

  robot.hear(/!printanswers?/i, function(msg) {
    msg.send(getAnswersMsg());
  });

  robot.hear(/^!(guess ?answer|ga) (\d+) (.*?)\s*$/i, function(msg) {
    if (Referee.roundIsInProgress()) {
      message = 'The round isn\'t over yet! To end the round, say `!endquestion`.\n';
      message += submitAnswerHelpMsg;
    } else if (Referee.haveAllBeenGuessed()) {
      message = 'All answers have been guessed! To start a new round, say `!loadquestion`.';
    } else if (Referee.getNumAnswers() > 0) {
      var answerNum = Number(msg.match[2]);
      var user = msg.match[3];
      var username = getUsername(msg);

      var answers = Referee.answers();
      var orderedAnswers = Referee.orderedAnswers();

      if (user.startsWith('@')) {
        user = user.substr(1);
      }

      if (username == user) {
        msg.send('You can\'t guess your own answer, cheater!');
        Stats.cheated(username);
        return;
      }

      if (answers.hasOwnProperty(user)){
        if (!orderedAnswers[answerNum]['guessed'] && !answers[user]['guessed']) {
          if (orderedAnswers[answerNum]['user'] == user){
            Referee.answerFound(user, answerNum);
            message = 'You got it!! "' + answers[user]['answer'] + '" was submitted by ' + user + '.\n\n';

            Stats.correct(username);

            if (Referee.haveAllBeenGuessed()) {
              message += getAnswersMsg();
              setTopic(msg.message.room, "Ready to start next round!");
            }
          } else {
            message = 'Nope, guess again.';
            Stats.wrong(username);
          }
        } else {
          if (answers[user]['guessed']) {
            message = 'That user\'s answer was already found, you ' + getRandomInsult() +'!\n\n';
            Stats.wrong(username);
          } else {
            message = 'That answer number was already correctly guessed, you ' + getRandomInsult() + '!\n\n';
            Stats.wrong(username);
          }
        }
      } else {
        message = 'That user didn\'t submit an answer to this question. :cold_sweat:';
        Stats.wrong(username);
      }
    } else if(Referee.getNumAnswers() == 0) {
      message = 'There were no answers for the previous round! Sorry about that :\\';
    } else {
      message = 'Whoa jeez i\'m not sure how we got here.';
    }
    msg.send(message);
  });

  robot.hear(/!lqstats ?(.*)?/i, function(msg) {
    var user = msg.match[1];
    var message = '_Stats';
    stats = Stats.loadStats();

    if (user) {
      var data = stats['usersData'][user]
      message += ' for *' + user + '*_:\n\n';
      message += '>*Total Answers*: ' + data['answers'] + '\n';
      message += '>*Total Guesses*: ' + data['guesses'] + '\n';
      message += '>  - *Total Correct*: ' + data['rights'] + '\n';
      message += '>  - *Total Incorrect*: ' + data['wrongs'] + '\n';
      message += '>  - *Total Cheats*: ' + data['cheats'];
    } else {
      message += ' for Loaded Questions_:\n\n';
      message += '>*Total Questions*: ' + Questions.length + '\n';
      message += '>*Total Questions Loaded*: ' + stats['numQuestions'] + '\n';
      message += '>*Total Answers Given*: ' + stats['numAnswers'] + '\n';
      message += '>*Players*: ' + Object.keys(stats['usersData']).join(', ') + '\n\n';
      message += '_To find out stats about a specific player, say_ `!lqstats [username]`.';
    }

    msg.send(message);
  });
}
