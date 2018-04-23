const express = require('express');
const path = require('path');
const request = require('request');
const redis = require('redis');

const app = express();
const redisClient = redis.createClient(process.env.REDIS_URL);

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

function track(slackTeam, slackChannel, slackUser) {
  const options = {
    method: 'POST',
    uri: 'https://app-analytic.herokuapp.com/track/slack-sandbox',
    json: true,
    body: {
      slackTeam,
      slackChannel,
      slackUser,
    },
  };

  // request(options, () => {});
}

// app.post('/slack', (req, res) => {
//   if (req.body.token !== process.env.SLACK_VERIFY_TOKEN) {
//     return res.sendStatus(400);
//   }

//   let phrase = req.body.text;
//   let emoji;

//   if (!phrase || phrase === 'help') {
//     track();
//     return res.send({
//       response_type: 'ephemeral',
//       text: 'How to use /clap',
//       attachments: [{
//         text: "To add some claps to your life, use `/clap phrase`\nIf you want to clap without a clap, change it up with `/clap phrase emoji`\nWhichever emoji you put at the end, that's what you'll clap with!",
//       }],
//     });
//   }

//   const regex = /^(.*?)(:\S*?:)$/g;
//   const match = regex.exec(phrase);

//   if (match) {
//     phrase = match[1];
//     emoji = match[2];
//   }

//   track(phrase, emoji, req.body.team_domain, req.body.channel_name, req.body.user_name);

//   return res.send({
//     response_type: 'in_channel',
//     text: clapPhrase(phrase, emoji),
//   });
// });

app.post('/slack/create', (req, res) => {
  if (req.body.token !== process.env.SLACK_VERIFY_TOKEN) {
    return res.sendStatus(400);
  }

  redisClient.hgetall(req.body.team_id, (err, auth) => {
    request({
      method: 'POST',
      uri: 'https://slack.com/api/dialog.open',
      auth: {
        bearer: auth.access_token,
      },
      json: true,
      body: {
        trigger_id: req.body.trigger_id,
        dialog: {
          callback_id: 'create',
          title: 'Create A Code Snippet',
          submit_label: 'Create',
          elements: [{
            label: 'Name',
            name: 'name',
            type: 'text',
            hint: 'The name you\'ll use to execute your code',
          }, {
            label: 'Access',
            name: 'access',
            type: 'select',
            placeholder: 'Who can read, edit, and execute this snippet?',
            options: [{
              label: 'Anyone in the workspace',
              value: 'public',
            }, {
              label: 'Only me',
              value: 'private',
            }],
          }, {
            label: 'JavaScript',
            name: 'code',
            type: 'textarea',
            hint: 'Enter the code that you want to save',
          }],
        },
      },
    }, (error, response, body) => {
      // console.log(`Error: ${JSON.stringify(error)}`);
      // console.log(`Body: ${JSON.stringify(body)}`);
      return res.status(200).send();
    });
  });

  console.log(JSON.stringify(req.body));

  track(req.body.team_domain, req.body.channel_name, req.body.user_name);
});

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

  redisClient.exists(codeKey, (err, reply) => {
    if (reply === 1) {
      console.log(`${codeKey} exists`);
      return res.send({
        errors: [{
          name: 'name',
          error: 'Name is already in use!',
        }],
      });
    }
    console.log(`${codeKey} doesn't exist`);
    redisClient.hmset(codeKey, req.body.submission, (err, reply) => {
      console.log(`Reply: ${reply}`);
      res.sendStatus(200);
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
    console.log(JSONresponse);
    if (!JSONresponse.ok) {
      res.redirect('https://emojipedia.org/cross-mark/');
    } else {
      redisClient.hmset(JSONresponse.team_id, {
        access_token: JSONresponse.access_token,
        scope: JSONresponse.scope,
      }, () => {
        res.redirect('https://emojipedia.org/white-heavy-check-mark/');
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
