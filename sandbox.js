const { NodeVM } = require('vm2');

const vm = new NodeVM({
  require: {
    // builtin: ['*'],
  },
});

const functionWithCallbackInSandbox = vm.run(`
    module.exports = function(text, callback) {
      const fs = require('fs');
      fs.writeFile('message.txt', text, function (err) {
        if (err) throw err;
        console.log("It\'s saved! in same location.");
        callback(text);
      });
    }
`, 'vm.js');

functionWithCallbackInSandbox('world', (greeting) => {
  console.log(greeting);
});
