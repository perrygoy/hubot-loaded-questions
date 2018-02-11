const Helper = require('hubot-test-helper');

describe('When a user types \'!loadquestion\'', () => {
    let lqBotRoom;
    beforeAll(() => {
        const helper = new Helper('../../src/loaded-questions.js');
        return lqBotRoom = helper.createRoom({ httpd: false, name: '#random' });
    });
    beforeEach(() => {
        return lqBotRoom.user.say('billy', '!loadquestion');
    });
    afterAll(() => {
        return lqBotRoom.user.say('billy', '!endquestion');
    });
    test('Start a new round if there is no active question', () => {
        expect(lqBotRoom.messages).toHaveLength(2);
        expect(lqBotRoom.messages[0]).toHaveLength(2);
        expect(lqBotRoom.messages[1][1]).toEqual(expect.stringContaining('NEW ROUND STARTED'));
    });
    test('Display a descriptive message if round is already active', () => {
        expect(lqBotRoom.messages).toHaveLength(4);
        expect(lqBotRoom.messages[3]).toHaveLength(2);
        expect(lqBotRoom.messages[3][1]).toEqual(expect.stringContaining('There is already a question loaded!'));
    });
    test('Set rooom topic when question is loaded', () => {
        const roomTopics = Object.values(lqBotRoom.robot.adapter.client.roomTopics);
        expect(roomTopics).toHaveLength(1);
    });
    test('Room topic should be the same as the active question', () => {
        const roomTopics = Object.values(lqBotRoom.robot.adapter.client.roomTopics);
        const { loadedQuestionsGame } = lqBotRoom.robot.brain.data;
        expect(roomTopics[0]).toEqual(loadedQuestionsGame.curQuestion);
    });
});