// loaded-questions.js has been built specifically for slack
// this transform gives the test-helper adapter the proper signature to set a slack room topic
const MODULE_STRING = 'module.exports = function(robot) {';

const TRANSFORM_CODE = `
robot.adapter.client = {
    roomTopics: {},
    setTopic(roomId, topicText) {
        this.roomTopics[roomId] = topicText;
    },
    getTopic(roomId) {
        return this.roomTopics[roomId];
    },
};`;

module.exports = {
    process(src, filename, config, options) {
        const moduleIndex = src.indexOf(MODULE_STRING);
        const insertIndex = moduleIndex + MODULE_STRING.length;

        return `
    ${src.substring(0, insertIndex)}
    // a jest transform inserted this code:    
    ${TRANSFORM_CODE}
    // end jest transform
    ${src.substring(insertIndex)}
    `;
    },
};
