hubot-loaded-questions
======================

Play Loaded Questions, the game where guessing the answers gets you in just as much trouble as giving your own.

## The Game
Loosely based on the hit board game by Freshly Completed, http://freshlycompleted.blogspot.com/2013/11/loaded-questions-free-printable-game.html

A typical game of Loaded Questions follows these steps:
* Someone types `!loadquestion` in the Loaded Questions room.
```asciidoc
[hubot APP] *NEW ROUND STARTED!!!*

The current question is: *"If you could add one feature to your cell phone, what would it be?"*
You can submit your own answer by sending me a private message beginning with `submit answer`, followed by your answer
```
* Anyone who wants to play sends a PM to Hubot in the format `submit answer HERE IS WHERE MY ANSWER GOES!`
* Once enough people have submitted answers, a countdown begins to end the round. The default is 5 players for quorum and a 5 minute countdown; see [Configuration](#configuration) below. Or, someone can say `!endquestion` to end the round early.
* When the round ends, Hubot will say:
```asciidoc
[hubot APP] *ROUND ENDED!!!* (due to timeout)

There were 6 answers submitted for _"If you could add one feature to your cell phone, what would it be?"_:
> *1.* a pez dispenser
> *2.* send scheduled text messages to my parents
> *3.* A "receive call" feature would be sweet. :(
> *4.* lead into gold
> *5.* a spray bottle
> *6.* curing diseases for a nominal fee (paid directly to me)


Players whose answers haven't been guessed: *user2*, *user1*, *user6*, *user4*, *user5*, *user3*.
To guess who submitted an answer, say `!guessanswer [number] [username]`.
```
* Users can then optionally guess who submitted each answer by saying `!guessanswer` or `!ga` followed by their guess.
* As each answer is guessed, Hubot will let you know if you guessed correctly or incorrectly.
* You can re-print the answers list to see which answers have been guessed so far (or because the list has scrolled way off the screen) by saying `!printanswers`.
* Once all the answers are guessed, Hubot will wait patiently for the next round!

After playing for a while, you can see stats for the game by saying `!lqstats`, or stats for individual players by saying `!lqstats [username]`.

## Configuration
Loaded Questions has these configurable values:
* `HUBOT_LOADED_QUESTIONS_ROOM` - which channel name or ID to post messages to (this game can be a little spammy, so it's best to have a dedicated room). By default, Hubot will save the ID of the room that it first hears `!loadquestion` in.
* `HUBOT_LOADED_QUESTIONS_QUORUM` - how many answers to wait for before triggering a countdown to end the round. Default is 5.
* `HUBOT_LOADED_QUESTIONS_SKIPNUM` - how many users must agree to skip a question before it is skipped. Default is 2.
* `HUBOT_LOADED_QUESTIONS_TIMEOUT` - how many minutes to wait during the countdown before the round ends. Default is 5.
* `HUBOT_INCLUDE_RANDOM_ANSWER` - whether or not to include a random answer from last round as hubot's answer. Default is true, but you'll need to play a full round (get through all the questions!) before these start showing up.

Loaded Questions comes with a default set of 300 questions.  More can be added by creating a `loaded_questions.json` file in the `res/` directory at the root of your Hubot project. This allows you to add those questions your friends keep asking you to add. Here's an example of what that might look like:
```json
// hubot/res/loaded_questions.json
[
    "Ding dong! Who's there?",
    "Doctors hate him! What did he do?",
    {
      "question": "What's your {{}}?",
      "data": ["password", "social security number", "mother's maiden name"]
    }
]
```

Loaded Questions will find those extra questions and add 'em to the mix! Hubot will ask each question once at random, then shuffle the full list again.

Note that strange-lookin' question object in there. Those `{{}}`s signify a bit of randomness in the question. The question will still only be asked once per round, but it will be asked with a random choice from the `data` array to fill in the `{{}}` in the question. You can see several more examples of questions with this random feature in hubot-loaded-questions' `res/base_questions.json` file.

## Commands
* `!loadquestion` - (public only) starts a new question, if there isn't one currently.
* `!printquestion` - (public or pm) prints the current question.
* `!skipquestion` - (public only) votes to skips the current question and load a new one.
* `!endquestion` - (public only) ends the round of questioning and displays the answers.
* `!printanswers` - (public or pm) prints the answers that were given during the round.
* `!guessanswer [number] [user]` - (public only) guess that answer `number` was submitted by `user`. You can shortcut this command with `!ga [number] [user]`.
* `submit answer [answer]` - (pm only) submits your answer to the question.
* `!lqstats [username]` - (public or pm) shows some stats about the game. Optionally include a username to see stats for that specific user.

Uses hubot brain to keep track of the game state and some stats.

## Add it to your hubot!

Run the following command

    $ npm install hubot-loaded-questions --save

Then add `hubot-loaded-questions` to the `external-scripts.json` file (you may need to create this file).

    ["hubot-loaded-questions"]


## Issues
If you find a bug, please let me know about it at https://github.com/perrygoy/hubot-loaded-questions/issues. This module was only tested on Discord and Slack, so I'm not sure how it behaves on other chat clients.

------
I've had a ton of fun creating this module and playing it with my friends, and i want it to be a great time for everyone. Thanks for taking the time to read this README, and i hope you have a great time playing Loaded Questions!
