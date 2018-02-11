const Helper = require('hubot-test-helper');

const { SubmitAnswerMock } = require('./util');

const timeStamp = Date.now();

const UP_TIME = 11 * 47 * 1000;

const NOW_PLUS_UP_TIME = new Date(timeStamp + UP_TIME);

const UP_TIME_MINUTES = Math.floor(UP_TIME / 60 / 1000);

const UP_TIME_STRING = `~${UP_TIME_MINUTES} minutes`;

jest.useFakeTimers();

describe('When a user types \'!printquestion\'', () => {
    let lqBotRoom;
    let submitAnswerMock;
    beforeEach(() => {
        const helper = new Helper('../../src/loaded-questions.js');
        lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
        submitAnswerMock = new SubmitAnswerMock(lqBotRoom);
    });
    test('If there\'s no active question, respond with a message to that effect', async () => {
        await lqBotRoom.user.say('billy', '!printquestion');
        expect(lqBotRoom.messages).toHaveLength(2);
        expect(lqBotRoom.messages[1]).toHaveLength(2);
        expect(lqBotRoom.messages[1][1]).toEqual(expect.stringContaining('There isn\'t a question loaded right now'));
    });
    describe('If there\'s an active question, respond with a message...', () => {
        beforeEach(async () => {
            const helper = new Helper('../../src/loaded-questions.js');
            lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
            await lqBotRoom.user.say('billy', '!loadquestion');
            await submitAnswerMock.sendPrivate('billy', 'submit answer this is billy\'s answer');
            await submitAnswerMock.sendPrivate('bobby', 'submit answer this is bobby\'s answer');
            Date = jest.fn(() => NOW_PLUS_UP_TIME);
            await lqBotRoom.user.say('billy', '!printquestion');
        });
        afterEach(async () => {
            await lqBotRoom.user.say('billy', '!endquestion');
        });
        test('...that contains the up time of the question', () => {
            expect(lqBotRoom.messages).toHaveLength(6);
            expect(lqBotRoom.messages[5]).toHaveLength(2);
            expect(lqBotRoom.messages[5][1]).toEqual(expect.stringContaining(UP_TIME_STRING));
        });
        test('...that contains the number of answers submitted', () => {
            expect(lqBotRoom.messages).toHaveLength(6);
            expect(lqBotRoom.messages[5]).toHaveLength(2);
            expect(lqBotRoom.messages[5][1]).toEqual(expect.stringContaining('2 answers'));
        });
    });
});
