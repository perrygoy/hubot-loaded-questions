# Tests
This module uses [hubot-test-helper](https://github.com/mtsmfm/hubot-test-helper), [Facebook's jest](https://facebook.github.io/jest/), and several jest transforms to properly mock the bot and slack's hubot adapter. 

## Running 

After running `npm install`, the following testing scripts can be run:
* `npm run test` - Runs all tests in __test__ folder
* `npm run debugTest` - Runs tests in debug mode for node inspector. Make sure to add a debugger to your code to set a break point!
* `npm run clearTestCache` - Clears the jest cache for the occasional caching problems jest has.

## Writing

### When writing a test for interacting with the bot, first take the following steps:
```javascript
// Import the helper module
const Helper = require('hubot-test-helper') 
// Instantiate the helper bot with the loaded questions game
const helper = new Helper('../../src/loaded-questions.js') 
// Create a room. You'll need to assign it to a variable that's defined in a scope shared by all the tests. Current tests use a variable in the parent describe block.
let lqBotRoom = helper.createRoom({ httpd: false, name: '#random' }); 
```

### Now that your bot helper is initialized, you can use it to

* `lqBotRoom.user.say('userName', 'messageText')` - Send a message to the room from a user. User messages and bot responses will be stored in `lqBotRoom.messages`
* `lqBotRoom.user.sayPrivate('userName', 'messageText')` - Send a private message to the bot from a user. Private messages and responses will be stored in `lqBotRoom.privateMessages['userName']`

### Both private and public message stores will be arrays with the following shape:

    [['userName', 'messageText'], ['hubot', 'responseText']]