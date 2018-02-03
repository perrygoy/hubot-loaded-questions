const runTransform = require('../runTransform');

const TRANSFORMS = [
    // this transform gives the hubot-test-helper adapter the proper signature
    // to set a slack room topic
    {
        INSERT_STRING: 'this.privateMessages = {};',
        CODE: `
            this.client = {
                roomTopics: {},
                setTopic(roomId, topicText) {
                    this.roomTopics[roomId] = topicText;
                },
                getTopic(roomId) {
                    return this.roomTopics[roomId];
                },
            };
        `,
    },
    // this transform gives the hubot-test-helper adapter the ability for
    // users to send the bot private messages
    {
        INSERT_STRING: 'this.user = {',
        CODE: `
            sayPrivate: (userName, message, userParams) => this.receive(userName, message, userParams, true),
        `,
    },
    // this transform gives the hubot-test-helper adapter the ability to
    // track the private messages sent to it with a similar signature to slack
    {
        INSERT_STRING: `textMessage = new Hubot.TextMessage(user, message);
      }`,
        CODE: `
            textMessage.rawMessage = {
                channel: {
                    is_im: isPrivate,
                },
            };
        
            if (isPrivate) {
                this.privateMessages[userName] = [];
                this.privateMessages[userName].push([userName, textMessage.text]);
                return this.robot.receive(textMessage, resolve);
            }
        `,
    },
    // this transform gives the hubot-test-helper adapter the ability to
    // respond to private messages sent to it
    {
        INSERT_STRING: `send(envelope/*, ...strings*/) {
    const strings = [].slice.call(arguments, 1);`,
        CODE: `
            if (envelope.message != null && envelope.message.rawMessage.channel.is_im) {
                if (!Array.isArray(this.privateMessages[envelope.user.name])) {
                    this.privateMessages[envelope.user.name] = [];
                }
                strings.forEach((str) => this.privateMessages[envelope.user.name].push(['hubot', str]));
                return
            }
        `,
    },
];

module.exports = {
    process(src, filename, config, options) {
        let newSrc = src;

        TRANSFORMS.forEach(TRANSFORM => {
            newSrc = runTransform(newSrc, TRANSFORM);
        });

        return newSrc;
    },
};
