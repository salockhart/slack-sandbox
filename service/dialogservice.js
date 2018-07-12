const request = require('request');

const createDialog = require('../dialogs/create');

module.exports = {
  openCreateDialog: (accessToken, triggerID, userInfo) => new Promise((resolve, reject) => {
    request({
      method: 'POST',
      uri: 'https://slack.com/api/dialog.open',
      auth: {
        bearer: accessToken,
      },
      json: true,
      body: {
        trigger_id: triggerID,
        dialog: createDialog(userInfo),
      },
    }, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      resolve(body);
    });
  }),
};
