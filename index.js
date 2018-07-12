const express = require('express');
const path = require('path');
const request = require('request');
const { NodeVM } = require('vm2');

const redisService = require('./service/redisservice');
const dialogService = require('./service/dialogservice');
const messageService = require('./service/messageservice');
const argService = require('./service/argumentsservice.js');

const app = express();

const port = (process.env.PORT || 3000);
app.set('port', port);

app.use(express.json());
app.use(express.urlencoded({
  extended: true,
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.static(path.join(__dirname, '/docs')));

function run(code, args = []) {
  return new Promise((resolve, reject) => {
    const vm = new NodeVM({
      // wrapper: 'none',
      require: {
        // builtin: ['*'],
      },
    });

    try {
      const vmCode = `module.exports = ${code}`;
      const functionWithCallbackInSandbox = vm.run(vmCode, 'vm.js');
      const result = functionWithCallbackInSandbox(...args);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

function track(type) {
  const options = {
    method: 'POST',
    uri: 'https://app-analytic.herokuapp.com/track/slack-sandbox',
    json: true,
    body: {
      type,
    },
  };

  // request(options, () => {});
}

app.post('/slack/create', (req, res) => {
  if (req.body.token !== process.env.SLACK_VERIFY_TOKEN) {
    return res.sendStatus(400);
  }

  console.log(JSON.stringify(req.body, null, 5));

  track('create');

  const userInfo = {
    name: req.body.text,
  };

  redisService.getObject(req.body.team_id)
    .then(auth => dialogService.openCreateDialog(auth.access_token, req.body.trigger_id, userInfo))
    .then(() => {
      res.status(200).send();
    })
    .catch(() => {
      res.status(500).send();
    });
});

app.post('/slack/run', (req, res) => {
  if (req.body.token !== process.env.SLACK_VERIFY_TOKEN) {
    return res.sendStatus(400);
  }

  console.log(JSON.stringify(req.body, null, 5));

  track('run');

  const command = argService.parse(req.body.text);

  if (command.length < 1) {
    return res.status(400).send();
  }

  const [snippetName, ...args] = command;

  redisService.keysMatching(`${req.body.team_id}*.${snippetName}`)
    .then((keys) => {
      // TODO: Handle access levels
      if (keys.length < 1) {
        throw new Error();
      }
      return redisService.getObject(keys[0]);
    })
    .then(snippet => run(snippet.code, args))
    .then((result) => {
      redisService.getObject(req.body.team_id)
        .then(auth => messageService.sendSnippetComplete(
          auth.access_token,
          req.body.channel_id,
          req.body.user_id,
          true,
          result.toString() // eslint-disable-line comma-dangle
        ))
        .then(() => res.status(200).send());
    })
    .catch((err) => {
      redisService.getObject(req.body.team_id)
        .then(auth => messageService.sendSnippetError(
          auth.access_token,
          req.body.channel_id,
          req.body.user_id,
          `There was an error running your snippet:  ${`\`${err.toString()}\`` || 'Please try again later'}` // eslint-disable-line comma-dangle
        ))
        .then(() => res.status(200).send());
    });
});

function handleCreateSnippet(submission, codeKey) {
  const defaults = {
    access: 'public',
    args: '',
  };

  const overrides = {};

  return new Promise((resolve, reject) => {
    redisService.keyExists(codeKey)
      .then(() => {
        if (!submission.args) {
          overrides.args = '';
        }

        const args = argService.parse(submission.args || '');
        return run(submission.code, args);
      })
      .then(() => redisService.setObject(
        codeKey,
        Object.assign({}, defaults, submission, overrides) // eslint-disable-line comma-dangle
      ))
      .catch((err) => {
        if (!err) {
          return reject({
            errors: [{
              name: 'name',
              error: 'Name is already in use!',
            }],
          });
        }
        return reject({
          errors: [{
            name: 'code',
            error: err.toString(),
          }],
        });
      })
      .then(() => {
        resolve(submission);
      })
      .catch(() => {
        reject({
          error: true,
        });
      });
  });
}

app.post('/slack/interactive', (req, res) => {
  req.body = JSON.parse(req.body.payload);

  if (req.body.token !== process.env.SLACK_VERIFY_TOKEN) {
    return res.sendStatus(400);
  }

  console.log(JSON.stringify(req.body, null, 5));

  let codeKey = `${req.body.team.id}`;
  if (req.body.submission.access === 'private') {
    codeKey = `${codeKey}.${req.body.user.id}`;
  }
  codeKey = `${codeKey}.${req.body.submission.name}`;

  let handler = Promise.resolve();

  if (req.body.callback_id === 'create') {
    handler = handleCreateSnippet(req.body.submission, codeKey)
      .then(data => redisService.getObject(req.body.team.id)
        .then(auth => messageService.sendCreateComplete(
          auth.access_token,
          req.body.channel.id,
          req.body.user.id,
          data // eslint-disable-line comma-dangle
        ))
        .then(() => data));
  }

  handler
    .then(() => {
      res.send();
    })
    .catch((err) => {
      res.send(err || {
        error: true,
      });
    });
});

app.get('/slack/redirect', (req, res) => {
  const options = {
    method: 'GET',
    uri: `https://slack.com/api/oauth.access?code=${req.query.code}&client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`,
  };

  request(options, (error, response, body) => {
    const JSONresponse = JSON.parse(body);
    if (!JSONresponse.ok) {
      res.redirect('https://emojipedia.org/cross-mark/');
    } else {
      redisService.setObject(JSONresponse.team_id, {
        access_token: JSONresponse.access_token,
        scope: JSONresponse.scope,
      })
        .then(() => {
          res.redirect('https://emojipedia.org/white-heavy-check-mark/');
        })
        .catch(() => {
          res.redirect('https://emojipedia.org/cross-mark/');
        });
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
