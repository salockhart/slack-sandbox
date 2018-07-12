const request = require('request');

module.exports = {
  sendCreateComplete: (accessToken, channel, user, snippetInfo) => new Promise((resolve, reject) => { // eslint-disable-line max-len
    request({
      method: 'POST',
      uri: 'https://slack.com/api/chat.postEphemeral',
      auth: {
        bearer: accessToken,
      },
      json: true,
      as_user: false,
      body: {
        channel,
        user,
        text: `Your snippet "${snippetInfo.name}" has been created!`,
        attachments: [
          {
            text: `Try it out with /run ${snippetInfo.name}, or edit it with /edit ${snippetInfo.name} to get started`,
            fallback: 'You are unable to edit your snippet',
            callback_id: 'edit',
            // color: '#3AA3E3',
            attachment_type: 'default',
            actions: [
              {
                name: 'edit',
                text: 'Edit',
                type: 'button',
                value: 'edit',
              },
            ],
          },
        ],
      },
    }, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      resolve(body);
    });
  }),

  sendSnippetError: (accessToken, channel, user, message) => new Promise((resolve, reject) => {
    request({
      method: 'POST',
      uri: 'https://slack.com/api/chat.postEphemeral',
      auth: {
        bearer: accessToken,
      },
      json: true,
      as_user: false,
      body: {
        channel,
        user,
        text: message,
        attachments: [],
      },
    }, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      resolve(body);
    });
  }),

  sendSnippetComplete: (accessToken, channel, user, isEphemeral, message) => new Promise((resolve, reject) => { // eslint-disable-line max-len
    request({
      method: 'POST',
      uri: isEphemeral ? 'https://slack.com/api/chat.postEphemeral' : 'https://slack.com/api/chat.postMessage',
      auth: {
        bearer: accessToken,
      },
      json: true,
      as_user: false,
      body: {
        channel,
        user,
        text: message,
        attachments: [],
      },
    }, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      resolve(body);
    });
  }),
};
